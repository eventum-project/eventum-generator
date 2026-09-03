import pytest
from pydantic import HttpUrl, ValidationError

from eventum.plugins.output.fields import (
    Format,
    JsonFormatterConfig,
    SimpleFormatterConfig,
    TemplateFormatterConfig,
)
from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig


def test_config_defaults():
    config = OtlpOutputPluginConfig(endpoint=HttpUrl('http://localhost:4318'))

    assert config.formatter.format == Format.PLAIN
    assert config.verify is True
    assert config.headers == {}


def test_config_takes_ecs_fields_by_default():
    config = OtlpOutputPluginConfig(endpoint=HttpUrl('http://localhost:4318'))

    assert config.timestamp_field == '@timestamp'
    assert config.severity_field == 'log.level'


@pytest.mark.parametrize(
    'formatter',
    [
        JsonFormatterConfig(format=Format.JSON_BATCH, indent=0),
        TemplateFormatterConfig(
            format=Format.TEMPLATE_BATCH,
            template='{{ events }}',
        ),
        SimpleFormatterConfig(format=Format.EVENTUM_HTTP_INPUT),
    ],
)
def test_config_rejects_batch_formatters(formatter):
    with pytest.raises(ValidationError):
        OtlpOutputPluginConfig(
            endpoint=HttpUrl('http://localhost:4318'),
            formatter=formatter,
        )


def test_config_rejects_lonely_client_cert():
    with pytest.raises(ValidationError):
        OtlpOutputPluginConfig(
            endpoint=HttpUrl('http://localhost:4318'),
            client_cert='cert.pem',
        )


def test_config_resource_attributes_default_empty():
    config = OtlpOutputPluginConfig(endpoint=HttpUrl('http://localhost:4318'))

    assert config.resource_attributes == {}
    assert config.resource_attributes_from == {}


def test_config_rejects_empty_resource_path():
    with pytest.raises(ValidationError):
        OtlpOutputPluginConfig(
            endpoint=HttpUrl('http://localhost:4318'),
            resource_attributes_from={'host.name': ''},
        )


def test_config_body_and_flatten_defaults():
    config = OtlpOutputPluginConfig(endpoint=HttpUrl('http://localhost:4318'))

    assert config.body_field is None
    assert config.flatten_attributes is True


def test_config_rejects_empty_body_field():
    with pytest.raises(ValidationError):
        OtlpOutputPluginConfig(
            endpoint=HttpUrl('http://localhost:4318'),
            body_field='',
        )
