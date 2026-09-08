"""Unit tests for API-layer type relaxation (api_types module).

Tests validate that ``relax_model`` correctly transforms plugin config
models so every non-string field also accepts ``PlaceholderString``
values (``${params.*}`` / ``${secrets.*}``), while rejecting invalid
strings and preserving constraint validation for real values.
"""

from collections.abc import Iterator
from typing import (
    Annotated,
    Any,
    Literal,
    Self,
    TypeAliasType,
    get_args,
    get_origin,
)

import pytest
from pydantic import (
    BaseModel,
    Field,
    ModelWrapValidatorHandler,
    ValidationError,
    field_validator,
    model_validator,
)

from eventum.api.routers.generator_configs.api_types import (
    ApiGeneratorConfig,
    PlaceholderString,
    SubstitutionString,
    relax_model,
)
from eventum.plugins.loader import (
    get_event_plugin_names,
    get_input_plugin_names,
    get_output_plugin_names,
    load_event_plugin,
    load_input_plugin,
    load_output_plugin,
)

PH = '${params.x}'
SECRET = '${secrets.key}'


# - helpers ----------------------------------------------------------


def _relaxed(plugin_type: str, name: str) -> type[BaseModel]:
    loader = {
        'input': load_input_plugin,
        'event': load_event_plugin,
        'output': load_output_plugin,
    }[plugin_type]
    return relax_model(loader(name).config_cls)


def _valid(cls: type[BaseModel], data: dict) -> BaseModel:
    """Validate data and return the model instance."""
    return cls.model_validate(data)


def _rejects(cls: type[BaseModel], data: dict) -> None:
    """Assert that data is rejected."""
    with pytest.raises(ValidationError):
        cls.model_validate(data)


def _plugin_config_models() -> set[type[BaseModel]]:
    """Collect every model reachable from a registered plugin config."""
    roots = [
        *(
            load_input_plugin(name).config_cls
            for name in get_input_plugin_names()
        ),
        *(
            load_event_plugin(name).config_cls
            for name in get_event_plugin_names()
        ),
        *(
            load_output_plugin(name).config_cls
            for name in get_output_plugin_names()
        ),
    ]
    models: set[type[BaseModel]] = set()

    def collect(annotation: Any) -> None:
        if isinstance(annotation, TypeAliasType):
            collect(annotation.__value__)
            return

        if isinstance(annotation, type) and issubclass(annotation, BaseModel):
            if annotation in models:
                return
            models.add(annotation)
            for field in annotation.model_fields.values():
                collect(field.annotation)
            return

        for argument in get_args(annotation):
            collect(argument)

    for root in roots:
        collect(root)

    return models


def _reachable_models(*annotations: Any) -> set[type[BaseModel]]:
    """Collect model classes wired into the given annotations."""
    models: set[type[BaseModel]] = set()

    def collect(annotation: Any) -> None:
        if isinstance(annotation, TypeAliasType):
            collect(annotation.__value__)
            return

        if isinstance(annotation, type) and issubclass(annotation, BaseModel):
            if annotation in models:
                return
            models.add(annotation)
            for field in annotation.model_fields.values():
                collect(field.annotation)
            return

        for argument in get_args(annotation):
            collect(argument)

    for annotation in annotations:
        collect(annotation)

    return models


def _annotation_metadata(annotation: Any) -> Iterator[Any]:
    """Yield metadata held at any depth in an annotation."""
    if isinstance(annotation, TypeAliasType):
        yield from _annotation_metadata(annotation.__value__)
        return

    if get_origin(annotation) is Annotated:
        base, *metadata = get_args(annotation)
        yield from metadata
        yield from _annotation_metadata(base)
        return

    for argument in get_args(annotation):
        yield from _annotation_metadata(argument)


def _concrete_annotation_metadata(annotation: Any) -> Iterator[Any]:
    """Yield metadata outside the added substitution branches."""
    if annotation in (PlaceholderString, SubstitutionString):
        return

    if isinstance(annotation, TypeAliasType):
        yield from _concrete_annotation_metadata(annotation.__value__)
        return

    if get_origin(annotation) is Annotated:
        base, *metadata = get_args(annotation)
        yield from metadata
        yield from _concrete_annotation_metadata(base)
        return

    for argument in get_args(annotation):
        yield from _concrete_annotation_metadata(argument)


def _annotation_metadata_groups(
    annotation: Any,
    *,
    concrete_only: bool = False,
) -> Iterator[tuple[Any, ...]]:
    """Yield each ordered Annotated metadata group."""
    if concrete_only and annotation in (
        PlaceholderString,
        SubstitutionString,
    ):
        return

    if isinstance(annotation, TypeAliasType):
        yield from _annotation_metadata_groups(
            annotation.__value__,
            concrete_only=concrete_only,
        )
        return

    if get_origin(annotation) is Annotated:
        base, *metadata = get_args(annotation)
        yield tuple(metadata)
        yield from _annotation_metadata_groups(
            base,
            concrete_only=concrete_only,
        )
        return

    for argument in get_args(annotation):
        yield from _annotation_metadata_groups(
            argument,
            concrete_only=concrete_only,
        )


def _is_subsequence(
    expected: tuple[Any, ...], actual: tuple[Any, ...]
) -> bool:
    """Return whether expected occurs in actual in the same order."""
    remaining = iter(actual)
    return all(
        any(item == candidate for candidate in remaining) for item in expected
    )


# - opensearch (bool, int+Ge, list[HttpUrl], Path|None, HttpUrl|None,
#                nested model, discriminated union) -------------------

OS_BASE = {
    'hosts': ['https://localhost:9200'],
    'username': 'admin',
    'password': 'admin',
    'index': 'events',
    'formatter': {'format': 'plain'},
}


@pytest.fixture
def opensearch():
    return _relaxed('output', 'opensearch')


class TestOpensearchPlaceholders:
    """Opensearch config covers many type patterns."""

    def test_bool_placeholder(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'verify': PH})

    def test_bool_real_value(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'verify': True})

    def test_int_with_ge_placeholder(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'connect_timeout': PH})

    def test_int_with_ge_valid(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'connect_timeout': 5})

    def test_int_with_ge_below_constraint_rejected(self, opensearch):
        _rejects(opensearch, {**OS_BASE, 'connect_timeout': 0})

    def test_list_elements_placeholder(self, opensearch):
        _valid(
            opensearch,
            {
                **OS_BASE,
                'hosts': ['https://node1:9200', PH],
            },
        )

    def test_list_all_elements_placeholder(self, opensearch):
        _valid(
            opensearch,
            {
                **OS_BASE,
                'hosts': [PH, '${params.host2}'],
            },
        )

    def test_list_entire_field_placeholder(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'hosts': PH})

    def test_nested_model_placeholder(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'formatter': PH})

    def test_json_formatter_placeholder_indent(self, opensearch):
        _valid(
            opensearch,
            {
                **OS_BASE,
                'formatter': {'format': 'json', 'indent': PH},
            },
        )

    def test_template_formatter_placeholder_path(self, opensearch):
        _valid(
            opensearch,
            {
                **OS_BASE,
                'formatter': {'format': 'template', 'template': PH},
            },
        )

    def test_optional_path_placeholder(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'ca_cert': PH})

    def test_optional_path_none(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'ca_cert': None})

    def test_optional_path_real_value(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'ca_cert': '/etc/ssl/ca.pem'})

    def test_optional_url_placeholder(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'proxy_url': PH})

    def test_all_required_as_placeholders(self, opensearch):
        _valid(
            opensearch,
            {
                'hosts': [PH],
                'username': SECRET,
                'password': SECRET,
                'index': PH,
                'formatter': PH,
            },
        )


# - cron (int+Gt, tuple, TypeAlias Union|None) ----------------------


@pytest.fixture
def cron():
    return _relaxed('input', 'cron')


class TestCronPlaceholders:
    """Cron config covers int+Gt, tuple, TypeAlias in Union."""

    def test_int_with_gt_placeholder(self, cron):
        _valid(cron, {'expression': '* * * * *', 'count': PH})

    def test_int_with_gt_valid(self, cron):
        _valid(cron, {'expression': '* * * * *', 'count': 5})

    def test_int_with_gt_at_boundary_rejected(self, cron):
        _rejects(cron, {'expression': '* * * * *', 'count': 0})

    def test_tuple_placeholder(self, cron):
        _valid(
            cron,
            {
                'expression': '* * * * *',
                'count': 1,
                'tags': PH,
            },
        )

    def test_tuple_real_value(self, cron):
        _valid(
            cron,
            {
                'expression': '* * * * *',
                'count': 1,
                'tags': ('a', 'b'),
            },
        )

    def test_type_alias_union_none_placeholder(self, cron):
        _valid(
            cron,
            {
                'expression': '* * * * *',
                'count': 1,
                'start': PH,
            },
        )

    def test_type_alias_union_none_value(self, cron):
        _valid(
            cron,
            {
                'expression': '* * * * *',
                'count': 1,
                'start': '2026-01-01T00:00:00',
            },
        )

    def test_type_alias_union_none_null(self, cron):
        _valid(
            cron,
            {
                'expression': '* * * * *',
                'count': 1,
                'start': None,
            },
        )


# - http input (int+Ge+Le, str+MinLen) ------------------------------


@pytest.fixture
def http_input():
    return _relaxed('input', 'http')


class TestHttpInputPlaceholders:
    """HTTP input covers multiple constraints (Ge + Le) on port."""

    def test_port_placeholder(self, http_input):
        _valid(http_input, {'host': '0.0.0.0', 'port': PH})

    def test_port_valid(self, http_input):
        _valid(http_input, {'host': '0.0.0.0', 'port': 8080})

    def test_port_below_ge_rejected(self, http_input):
        _rejects(http_input, {'host': '0.0.0.0', 'port': -1})

    def test_port_above_le_rejected(self, http_input):
        _rejects(http_input, {'host': '0.0.0.0', 'port': 70000})


# - timer (float+Ge) ------------------------------------------------


@pytest.fixture
def timer():
    return _relaxed('input', 'timer')


class TestTimerPlaceholders:
    """Timer covers float with Ge constraint."""

    def test_float_ge_placeholder(self, timer):
        _valid(timer, {'seconds': PH, 'count': 1})

    def test_float_ge_valid(self, timer):
        _valid(timer, {'seconds': 0.5, 'count': 1})

    def test_float_ge_negative_rejected(self, timer):
        _rejects(timer, {'seconds': -1.0, 'count': 1})


# - clickhouse (ClickHouseDsn, Literal, TypeAlias StrEnum) ----------


@pytest.fixture
def clickhouse():
    return _relaxed('output', 'clickhouse')


CH_BASE = {
    'host': 'localhost',
    'table': 'events',
    'formatter': {'format': 'plain'},
}


class TestClickhousePlaceholders:
    """ClickHouse covers special Pydantic URL types and TypeAliases."""

    def test_dsn_placeholder(self, clickhouse):
        _valid(clickhouse, {**CH_BASE, 'dsn': PH})

    def test_literal_placeholder(self, clickhouse):
        _valid(clickhouse, {**CH_BASE, 'protocol': PH})

    def test_type_alias_enum_placeholder(self, clickhouse):
        _valid(clickhouse, {**CH_BASE, 'input_format': PH})


# - file output (TypeAlias Encoding, Literal write_mode) ------------


@pytest.fixture
def file_output():
    return _relaxed('output', 'file')


class TestFileOutputPlaceholders:
    """File output covers Encoding TypeAlias and Literal."""

    def test_encoding_alias_placeholder(self, file_output):
        _valid(
            file_output,
            {
                'path': 'out.log',
                'formatter': {'format': 'plain'},
                'encoding': PH,
            },
        )

    def test_encoding_alias_real_value(self, file_output):
        _valid(
            file_output,
            {
                'path': 'out.log',
                'formatter': {'format': 'plain'},
                'encoding': 'utf_8',
            },
        )

    def test_write_mode_literal_placeholder(self, file_output):
        _valid(
            file_output,
            {
                'path': 'out.log',
                'formatter': {'format': 'plain'},
                'write_mode': PH,
            },
        )


# - replay event (Path) ---------------------------------------------


@pytest.fixture
def replay():
    return _relaxed('event', 'replay')


class TestReplayPlaceholders:
    """Replay covers Path field."""

    def test_path_placeholder(self, replay):
        _valid(replay, {'path': PH})

    def test_path_real_value(self, replay):
        _valid(replay, {'path': '/data/events.log'})


# - timestamps input (Union[list[datetime], Path]) ------------------


@pytest.fixture
def timestamps():
    return _relaxed('input', 'timestamps')


class TestTimestampsPlaceholders:
    """Timestamps covers Union[list, Path] field."""

    def test_source_placeholder(self, timestamps):
        _valid(timestamps, {'source': PH})

    def test_source_path(self, timestamps):
        _valid(timestamps, {'source': '/data/ts.txt'})

    def test_source_list_item_placeholder(self, timestamps):
        _valid(timestamps, {'source': [PH]})


# - placeholder string validation -----------------------------------


class TestPlaceholderValidation:
    """PlaceholderString rejects non-placeholder strings."""

    def test_params_placeholder_accepted(self, opensearch):
        _valid(opensearch, {**OS_BASE, 'verify': '${params.verify}'})

    def test_secrets_placeholder_accepted(self, opensearch):
        _valid(
            opensearch,
            {
                **OS_BASE,
                'password': '${secrets.password}',
            },
        )

    def test_invalid_namespace_rejected(self, opensearch):
        _rejects(
            opensearch,
            {
                **OS_BASE,
                'connect_timeout': '${invalid.x}',
            },
        )

    def test_random_string_rejected(self, opensearch):
        _rejects(
            opensearch,
            {
                **OS_BASE,
                'connect_timeout': 'not_a_placeholder',
            },
        )

    def test_empty_string_in_non_str_field_rejected(self, opensearch):
        _rejects(opensearch, {**OS_BASE, 'verify': ''})

    def test_partial_placeholder_rejected(self, opensearch):
        _rejects(
            opensearch,
            {
                **OS_BASE,
                'connect_timeout': '${params}',
            },
        )


# - relax_model caching ---------------------------------------------


class TestRelaxModelCaching:
    """Verify that relax_model returns the same object for the same
    input class (caching works).
    """

    def test_same_class_returns_same_result(self):
        cls = load_output_plugin('opensearch').config_cls
        r1 = relax_model(cls)
        r2 = relax_model(cls)
        assert r1 is r2

    def test_different_classes_return_different_results(self):
        os_cls = load_output_plugin('opensearch').config_cls
        ch_cls = load_output_plugin('clickhouse').config_cls
        assert relax_model(os_cls) is not relax_model(ch_cls)


# - relax_model with synthetic models --------------------------------


class TestRelaxModelSynthetic:
    """Test relax_model with small synthetic Pydantic models to
    isolate specific type patterns.
    """

    def test_int_field_accepts_placeholder(self):
        class M(BaseModel):
            x: int

        relaxed = relax_model(M)
        assert _valid(relaxed, {'x': PH})
        assert _valid(relaxed, {'x': 42})

    def test_str_field_unchanged(self):
        class M(BaseModel):
            x: str

        relaxed = relax_model(M)
        assert _valid(relaxed, {'x': 'any_string'})
        assert _valid(relaxed, {'x': PH})

    def test_optional_int_placeholder(self):
        class M(BaseModel):
            x: int | None = None

        relaxed = relax_model(M)
        assert _valid(relaxed, {'x': PH})
        assert _valid(relaxed, {'x': 42})
        assert _valid(relaxed, {'x': None})

    def test_int_ge_constraint_scoped(self):
        class M(BaseModel):
            x: int = Field(ge=1)

        relaxed = relax_model(M)
        assert _valid(relaxed, {'x': PH})
        assert _valid(relaxed, {'x': 5})
        _rejects(relaxed, {'x': 0})

    def test_int_ge_le_both_constraints(self):
        class M(BaseModel):
            x: int = Field(ge=0, le=100)

        relaxed = relax_model(M)
        assert _valid(relaxed, {'x': PH})
        assert _valid(relaxed, {'x': 50})
        _rejects(relaxed, {'x': -1})
        _rejects(relaxed, {'x': 101})

    def test_nested_model_placeholder(self):
        class Inner(BaseModel):
            val: int

        class Outer(BaseModel):
            inner: Inner

        relaxed = relax_model(Outer)
        assert _valid(relaxed, {'inner': PH})
        assert _valid(relaxed, {'inner': {'val': 1}})
        assert _valid(relaxed, {'inner': {'val': PH}})

    def test_annotated_nested_model_field_is_relaxed(self):
        class Inner(BaseModel):
            value: int

        class Outer(BaseModel):
            inner: Annotated[Inner, object()]

        _valid(relax_model(Outer), {'inner': {'value': PH}})

    def test_recursive_model_uses_its_relaxed_copy(self):
        class Node(BaseModel):
            value: int
            child: Node | None = None

        relaxed = relax_model(Node)

        _valid(
            relaxed,
            {
                'value': 1,
                'child': {'value': PH},
            },
        )

    def test_plain_validator_accepts_recursive_field_placeholder(self):
        class Node(BaseModel):
            value: int
            child: Node | None = None

            @field_validator('child', mode='plain')
            @classmethod
            def validate_child(cls, value: Any) -> Any:
                return value

        relaxed = relax_model(Node)

        _valid(relaxed, {'value': 1, 'child': PH})

    def test_list_of_int_placeholder(self):
        class M(BaseModel):
            xs: list[int]

        relaxed = relax_model(M)
        assert _valid(relaxed, {'xs': [1, PH, 3]})
        assert _valid(relaxed, {'xs': PH})

    @pytest.mark.parametrize(
        'annotation,value',
        [
            (tuple[int, ...], (PH,)),
            (tuple[int, str], (PH, 'value')),
            (set[int], {PH}),
            (frozenset[int], frozenset({PH})),
        ],
    )
    def test_other_container_elements_accept_placeholders(
        self,
        annotation,
        value,
    ):
        model = type(
            'ContainerModel',
            (BaseModel,),
            {'__annotations__': {'value': annotation}},
        )

        _valid(relax_model(model), {'value': value})

    def test_validator_waits_for_placeholder_inside_frozenset(self):
        class Model(BaseModel):
            values: frozenset[int]

            @field_validator('values')
            @classmethod
            def reject_values(cls, value: frozenset[int]) -> frozenset[int]:
                raise ValueError('values are forbidden')

        relaxed = relax_model(Model)

        _valid(relaxed, {'values': frozenset({PH})})

    def test_dict_field_unchanged(self):
        class M(BaseModel):
            d: dict[str, int]

        relaxed = relax_model(M)
        assert _valid(relaxed, {'d': {'a': 1}})

    def test_literal_placeholder(self):
        class M(BaseModel):
            mode: Literal['a', 'b']

        relaxed = relax_model(M)
        assert _valid(relaxed, {'mode': PH})
        assert _valid(relaxed, {'mode': 'a'})
        _rejects(relaxed, {'mode': 'c'})

    def test_default_preserved(self):
        class M(BaseModel):
            x: int = 42

        relaxed = relax_model(M)
        m = _valid(relaxed, {})
        assert m.x == 42  # type: ignore[union-attr]

    def test_default_none_preserved(self):
        class M(BaseModel):
            x: int | None = None

        relaxed = relax_model(M)
        m = _valid(relaxed, {})
        assert m.x is None  # type: ignore


class TestCrossFieldRules:
    """A rule across fields holds for a config written in full and is
    left unanswered for one that still carries a placeholder.
    """

    def test_rule_of_the_original_model_holds(self):
        cls = _relaxed('output', 'tcp')

        _rejects(
            cls,
            {
                'host': 'h',
                'port': 514,
                'framing': 'octet_counting',
                'separator': '|',
            },
        )

    def test_rule_passes_a_config_that_complies(self):
        cls = _relaxed('output', 'tcp')

        _valid(cls, {'host': 'h', 'port': 514, 'framing': 'octet_counting'})

    def test_rule_of_a_nested_model_holds(self):
        cls = _relaxed('output', 'tcp')

        _rejects(
            cls,
            {
                'host': 'h',
                'port': 514,
                'formatter': {'format': 'syslog', 'rfc': 3164, 'bom': True},
            },
        )

    def test_rule_is_left_unanswered_under_a_placeholder(self):
        cls = _relaxed('output', 'tcp')

        _valid(
            cls,
            {
                'host': 'h',
                'port': 514,
                'framing': PH,
                'separator': '|',
            },
        )

    def test_rule_comparing_values_is_not_broken_by_a_placeholder(self):
        # A date range cannot be compared against a placeholder, and
        # the comparison used to raise out of the layer.
        cls = _relaxed('input', 'linspace')

        _valid(
            cls,
            {
                'start': PH,
                'end': '2026-01-01T00:00:00Z',
                'count': 10,
            },
        )

    def test_rule_comparing_values_holds_without_a_placeholder(self):
        cls = _relaxed('input', 'linspace')

        _rejects(
            cls,
            {
                'start': '2026-01-02T00:00:00Z',
                'end': '2026-01-01T00:00:00Z',
                'count': 10,
            },
        )


class TestPluginFieldRules:
    """Concrete plugin field rules hold in their relaxed copies."""

    def test_api_rejects_short_nested_field(self):
        data = {
            'input': [{'timer': {'seconds': 1, 'count': 1}}],
            'event': {'replay': {'path': 'events.json'}},
            'output': [
                {
                    'tcp': {
                        'host': 'localhost',
                        'port': 514,
                        'formatter': {
                            'format': 'syslog',
                            'structured_data': [{'id': '', 'params': {}}],
                        },
                    },
                },
            ],
        }

        _rejects(ApiGeneratorConfig, data)

    def test_nested_field_validator_rejects_concrete_value(self):
        cls = _relaxed('output', 'tcp')

        _rejects(
            cls,
            {
                'host': 'localhost',
                'port': 514,
                'formatter': {
                    'format': 'syslog',
                    'structured_data': [
                        {'id': 'invalid id', 'params': {}},
                    ],
                },
            },
        )

    def test_field_validator_waits_for_placeholder(self):
        cls = _relaxed('input', 'cron')

        _valid(cls, {'expression': PH, 'count': 1})

    @pytest.mark.parametrize('expression', ['${invalid.x}', '${params}'])
    def test_field_validator_rejects_an_invalid_token(self, expression):
        cls = _relaxed('input', 'cron')

        _rejects(cls, {'expression': expression, 'count': 1})

    def test_field_validator_waits_for_placeholder_in_mapping_key(self):
        cls = _relaxed('output', 'tcp')

        _valid(
            cls,
            {
                'host': 'localhost',
                'port': 514,
                'formatter': {
                    'format': 'syslog',
                    'structured_data': [
                        {
                            'id': 'example',
                            'params': {
                                '${params.a_long_structured_data_name}': 'v',
                            },
                        },
                    ],
                },
            },
        )

    def test_before_model_validator_is_preserved(self):
        cls = _relaxed('output', 'http')

        with pytest.raises(ValidationError, match='moved into the `auth`'):
            cls.model_validate(
                {
                    'url': 'https://example.com',
                    'username': 'user',
                },
            )

    def test_s3_validators_accept_relaxed_default_models(self):
        cls = _relaxed('output', 's3')

        _valid(cls, {'bucket': 'events'})
        _rejects(
            cls,
            {
                'bucket': 'events',
                'formatter': {'format': 'json-batch', 'indent': 0},
            },
        )

    def test_api_defers_a_validator_nested_inside_a_mapping(self):
        data = {
            'input': [{'timer': {'seconds': 1, 'count': 1}}],
            'event': {
                'template': {
                    'mode': 'all',
                    'templates': [
                        {
                            'example': {
                                'template': '${params.path}',
                                'vars': {},
                            },
                        },
                    ],
                },
            },
            'output': [{'stdout': {}}],
        }

        _valid(ApiGeneratorConfig, data)


class TestRegisteredPluginRules:
    """Every rule reachable from a registered config is preserved."""

    def test_validator_declarations_are_preserved(self):
        for model in _plugin_config_models():
            relaxed = relax_model(model)
            original = model.__pydantic_decorators__
            copied = relaxed.__pydantic_decorators__

            original_field = {
                name: (
                    decorator.info.fields,
                    decorator.info.mode,
                    decorator.info.check_fields,
                    repr(decorator.info.json_schema_input_type),
                )
                for name, decorator in original.field_validators.items()
            }
            copied_field = {
                name: (
                    decorator.info.fields,
                    decorator.info.mode,
                    decorator.info.check_fields,
                    repr(decorator.info.json_schema_input_type),
                )
                for name, decorator in copied.field_validators.items()
            }
            original_model = {
                name: decorator.info.mode
                for name, decorator in original.model_validators.items()
            }
            copied_model = {
                name: decorator.info.mode
                for name, decorator in copied.model_validators.items()
            }

            assert copied_field == original_field, model
            assert copied_model == original_model, model

            for name, decorator in original.field_validators.items():
                copied_validator = copied.field_validators[name].func
                assert (
                    copied_validator.__eventum_original_validator__
                    is decorator.func
                ), (model, name)

            for name, decorator in original.model_validators.items():
                copied_validator = copied.model_validators[name].func
                assert (
                    copied_validator.__eventum_original_validator__
                    is decorator.func
                ), (model, name)

    def test_validation_metadata_is_preserved(self):
        for model in _plugin_config_models():
            relaxed = relax_model(model)

            for name, field in model.model_fields.items():
                expected_groups = [
                    *_annotation_metadata_groups(field.annotation),
                    *((tuple(field.metadata),) if field.metadata else ()),
                ]
                if not expected_groups:
                    continue

                relaxed_field = relaxed.model_fields[name]
                actual_groups = list(
                    _annotation_metadata_groups(
                        relaxed_field.annotation,
                        concrete_only=True,
                    ),
                )

                assert all(
                    any(
                        _is_subsequence(expected, actual)
                        for actual in actual_groups
                    )
                    for expected in expected_groups
                ), (model, name, expected_groups, actual_groups)

                expected_items = [
                    item for group in expected_groups for item in group
                ]
                actual_items = list(
                    _concrete_annotation_metadata(relaxed_field.annotation),
                )
                for expected in expected_items:
                    matching_index = next(
                        (
                            index
                            for index, actual in enumerate(actual_items)
                            if actual == expected
                        ),
                        None,
                    )
                    assert matching_index is not None, (model, name, expected)
                    actual_items.pop(matching_index)

    def test_field_and_model_validation_settings_are_preserved(self):
        for model in _plugin_config_models():
            relaxed = relax_model(model)

            for key, value in model.model_config.items():
                assert relaxed.model_config.get(key) == value, (model, key)

            for name, field in model.model_fields.items():
                relaxed_field = relaxed.model_fields[name]
                assert relaxed_field.validate_default == field.validate_default

    def test_every_relaxed_plugin_model_is_wired_into_the_api(self):
        reachable = _reachable_models(
            *(
                field.annotation
                for field in ApiGeneratorConfig.model_fields.values()
            ),
        )

        for model in _plugin_config_models():
            assert relax_model(model) in reachable, model


class TestRelaxedRuleModes:
    """Every Pydantic validator mode keeps its concrete behaviour."""

    @pytest.mark.parametrize('mode', ['before', 'after', 'plain', 'wrap'])
    def test_field_validator_mode(self, mode):
        def reject(value: Any) -> Any:
            if value == 13:
                raise ValueError('thirteen is forbidden')
            return value

        if mode == 'wrap':

            def validate(value, handler):
                return reject(handler(value))

        else:
            validate = reject

        validator = field_validator('value', mode=mode)(validate)
        model = type(
            f'FieldValidator{mode.title()}Model',
            (BaseModel,),
            {
                '__annotations__': {'value': int},
                f'validate_{mode}': validator,
            },
        )
        relaxed = relax_model(model)

        _rejects(relaxed, {'value': 13})
        _valid(relaxed, {'value': PH})

        if mode == 'plain':
            _rejects(relaxed, {'value': f'prefix-{PH}'})

    def test_before_model_validator(self):
        class Model(BaseModel):
            value: int

            @model_validator(mode='before')
            @classmethod
            def reject_thirteen(cls, data: Any) -> Any:
                if isinstance(data, dict) and data.get('value') == 13:
                    raise ValueError('thirteen is forbidden')
                return data

        relaxed = relax_model(Model)

        _rejects(relaxed, {'value': 13})
        _valid(relaxed, {'value': PH})

    def test_after_model_validator(self):
        class Model(BaseModel):
            value: int

            @model_validator(mode='after')
            def reject_thirteen(self) -> Self:
                if self.value == 13:
                    raise ValueError('thirteen is forbidden')
                return self

        relaxed = relax_model(Model)

        _rejects(relaxed, {'value': 13})
        _valid(relaxed, {'value': PH})

    def test_wrap_model_validator(self):
        class Model(BaseModel):
            value: int

            @model_validator(mode='wrap')
            @classmethod
            def reject_thirteen(
                cls,
                data: Any,
                handler: ModelWrapValidatorHandler[Self],
            ) -> Self:
                model = handler(data)
                if model.value == 13:
                    raise ValueError('thirteen is forbidden')
                return model

        relaxed = relax_model(Model)

        _rejects(relaxed, {'value': 13})
        _valid(relaxed, {'value': PH})

    def test_wrap_field_validator_keeps_relaxed_shape_validation(self):
        class Model(BaseModel):
            value: list[int]

            @field_validator('value', mode='wrap')
            @classmethod
            def validate_value(cls, value, handler):
                return handler(value)

        relaxed = relax_model(Model)

        _rejects(relaxed, {'value': [PH, []]})

    def test_wrap_model_validator_keeps_relaxed_shape_validation(self):
        class Model(BaseModel):
            value: int
            other: int

            @model_validator(mode='wrap')
            @classmethod
            def validate_model(
                cls,
                data: Any,
                handler: ModelWrapValidatorHandler[Self],
            ) -> Self:
                return handler(data)

        relaxed = relax_model(Model)

        _rejects(relaxed, {'value': PH, 'other': []})

    def test_validated_default_keeps_its_rule(self):
        class Model(BaseModel):
            value: int = Field(default=0, ge=1, validate_default=True)

        relaxed = relax_model(Model)

        _rejects(relaxed, {})

    def test_validated_nested_default_uses_the_relaxed_model(self):
        class Inner(BaseModel):
            value: int

        class Model(BaseModel):
            inner: Inner = Field(
                default_factory=lambda: Inner(value=1),
                validate_default=True,
            )

        instance = _valid(relax_model(Model), {})

        assert instance.inner.value == 1

    def test_validated_nested_default_uses_validation_alias(self):
        class Inner(BaseModel):
            value: int = Field(validation_alias='incoming')

        class Model(BaseModel):
            inner: Inner = Field(
                default_factory=lambda: Inner(incoming=1),
                validate_default=True,
            )

        instance = _valid(relax_model(Model), {})

        assert instance.inner.value == 1

    def test_field_validator_keeps_keyword_only_parameters(self):
        class Model(BaseModel):
            value: int

            @field_validator('value')
            @classmethod
            def validate_value(cls, value: int, *, limit: int = 5) -> int:
                if value > limit:
                    raise ValueError('value is too large')
                return value

        relaxed = relax_model(Model)

        _valid(relaxed, {'value': 5})
        _rejects(relaxed, {'value': 6})

    def test_field_validator_waits_for_placeholder_in_prior_field(self):
        class Model(BaseModel):
            start: int
            end: int

            @field_validator('end')
            @classmethod
            def validate_order(cls, value: int, info: Any) -> int:
                if value <= info.data['start']:
                    raise ValueError('end must be after start')
                return value

        relaxed = relax_model(Model)

        _valid(relaxed, {'start': PH, 'end': 1})
        _rejects(relaxed, {'start': 2, 'end': 1})

    def test_optional_validator_parameter_is_not_treated_as_info(self):
        class Model(BaseModel):
            value: int

            @field_validator('value')
            @classmethod
            def validate_value(
                cls,
                value: int,
                info: Any = None,
            ) -> int:
                if info is not None:
                    raise ValueError('optional parameter was supplied')
                return value

        relaxed = relax_model(Model)

        _valid(relaxed, {'value': 1})

    def test_json_schema_input_type_is_relaxed(self):
        class Model(BaseModel):
            value: int

            @field_validator(
                'value',
                mode='before',
                json_schema_input_type=int,
            )
            @classmethod
            def validate_value(cls, value: Any) -> Any:
                return value

        schema = relax_model(Model).model_json_schema()['properties']['value']

        assert 'anyOf' in schema
        assert any(
            branch.get('type') == 'string' and 'pattern' in branch
            for branch in schema['anyOf']
        )

    def test_original_field_name_is_kept_with_an_alias(self):
        class Model(BaseModel):
            value_: int = Field(alias='value')

            model_config = {'populate_by_name': True}

        relaxed = relax_model(Model)

        _valid(relaxed, {'value': 1})
        _valid(relaxed, {'value_': 1})

    def test_string_constraints_apply_only_to_concrete_values(self):
        class Model(BaseModel):
            value: str = Field(min_length=2, max_length=3, pattern='^[a-z]+$')

        relaxed = relax_model(Model)

        _rejects(relaxed, {'value': ''})
        _rejects(relaxed, {'value': 'four'})
        _rejects(relaxed, {'value': '12'})
        _valid(relaxed, {'value': 'abc'})
        _valid(relaxed, {'value': '${params.a_long_name}'})
        _valid(relaxed, {'value': 'prefix-${params.name}'})

    @pytest.mark.parametrize(
        'value',
        ['${invalid.x}', 'prefix-${invalid.x}', '${params}'],
    )
    def test_string_constraints_reject_invalid_tokens(self, value):
        class Model(BaseModel):
            value: str = Field(min_length=2, max_length=3)

        relaxed = relax_model(Model)

        _rejects(relaxed, {'value': value})

    def test_substitution_string_is_constrained_in_json_schema(self):
        class Model(BaseModel):
            value: str = Field(min_length=2, max_length=3)

        branches = relax_model(Model).model_json_schema()['properties'][
            'value'
        ]['anyOf']

        assert {'type': 'string'} not in branches
