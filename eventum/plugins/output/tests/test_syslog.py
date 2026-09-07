"""Tests for rendering of events as syslog messages."""

import json
import re
from datetime import UTC, datetime, timedelta

import pytest
from pydantic import ValidationError

from eventum.plugins.output.exceptions import FormatError
from eventum.plugins.output.event_fields import lookup_field
from eventum.plugins.output.fields import Format
from eventum.plugins.output.syslog import (
    SYSLOG_SEVERITY_ALIASES,
    SyslogFacility,
    SyslogFormatterConfig,
    SyslogRenderer,
    SyslogSeverity,
)

EVENT = json.dumps(
    {
        '@timestamp': '2026-02-20T10:00:00.123456Z',
        'host': {'name': 'web-01'},
        'log': {'level': 'error'},
        'process.pid': 4242,
        'source': {'ip': '10.0.0.1'},
        'message': 'GET /api/users 200',
    },
)


def config(**kwargs) -> SyslogFormatterConfig:
    return SyslogFormatterConfig(format=Format.SYSLOG, **kwargs)


def render(event: str = EVENT, **kwargs) -> str:
    return SyslogRenderer(config(**kwargs)).render(event)


FACILITY_CODES = {
    'kern': 0,
    'user': 1,
    'mail': 2,
    'daemon': 3,
    'auth': 4,
    'syslog': 5,
    'lpr': 6,
    'news': 7,
    'uucp': 8,
    'cron': 9,
    'authpriv': 10,
    'ftp': 11,
    'ntp': 12,
    'audit': 13,
    'console': 14,
    'solaris-cron': 15,
    'local0': 16,
    'local1': 17,
    'local2': 18,
    'local3': 19,
    'local4': 20,
    'local5': 21,
    'local6': 22,
    'local7': 23,
}

SEVERITY_CODES = {
    'emerg': 0,
    'alert': 1,
    'crit': 2,
    'err': 3,
    'warning': 4,
    'notice': 5,
    'info': 6,
    'debug': 7,
}


# --- Code table tests ---


def test_facility_codes():
    assert {f.value: f.code for f in SyslogFacility} == FACILITY_CODES


def test_severity_codes():
    assert {s.value: s.code for s in SyslogSeverity} == SEVERITY_CODES


def test_severity_aliases():
    assert SYSLOG_SEVERITY_ALIASES == {
        'panic': 'emerg',
        'emergency': 'emerg',
        'critical': 'crit',
        'error': 'err',
        'warn': 'warning',
        'information': 'info',
        'informational': 'info',
    }


@pytest.mark.parametrize(('name', 'code'), FACILITY_CODES.items())
def test_every_facility_reaches_the_wire(name, code):
    line = render('e', facility=name, severity='emerg')
    assert line.startswith(f'<{code * 8}>')


@pytest.mark.parametrize(('name', 'code'), SEVERITY_CODES.items())
def test_every_severity_reaches_the_wire(name, code):
    line = render('e', facility='kern', severity=name)
    assert line.startswith(f'<{code}>')


@pytest.mark.parametrize(('alias', 'name'), SYSLOG_SEVERITY_ALIASES.items())
def test_every_severity_alias_reaches_the_wire(alias, name):
    line = render('e', facility='kern', severity=alias)
    assert line.startswith(f'<{SEVERITY_CODES[name]}>')


# --- Config tests ---


def test_defaults():
    cfg = config()
    assert cfg.rfc == 5424
    assert cfg.facility is SyslogFacility.USER
    assert cfg.severity is SyslogSeverity.INFO
    assert cfg.hostname == '-'
    assert cfg.app_name == '-'
    assert cfg.procid == '-'
    assert cfg.msgid == '-'
    assert cfg.timestamp is None
    assert cfg.structured_data == []
    assert cfg.message_field is None
    assert cfg.message_format == 'plain'
    assert cfg.bom is False


@pytest.mark.parametrize(
    ('value', 'expected'),
    [
        ('local0', SyslogFacility.LOCAL0),
        ('LOCAL0', SyslogFacility.LOCAL0),
        (16, 16),
    ],
)
def test_facility_values(value, expected):
    assert config(facility=value).facility == expected


@pytest.mark.parametrize(
    ('value', 'expected'),
    [
        ('err', SyslogSeverity.ERR),
        ('error', SyslogSeverity.ERR),
        ('WARN', SyslogSeverity.WARNING),
        ('panic', SyslogSeverity.EMERG),
        ('informational', SyslogSeverity.INFO),
        (3, 3),
    ],
)
def test_severity_values(value, expected):
    assert config(severity=value).severity == expected


@pytest.mark.parametrize(
    'kwargs',
    [
        {'facility': 24},
        {'facility': -1},
        {'facility': 'nope'},
        {'severity': 8},
        {'severity': 'nope'},
        {'rfc': 1234},
        {'message_format': 'yaml'},
    ],
)
def test_invalid_values(kwargs):
    with pytest.raises(ValidationError):
        config(**kwargs)


@pytest.mark.parametrize(
    'kwargs',
    [
        {'hostname': 'has space'},
        {'app_name': ''},
        {'procid': 'non-ascii-\u00e9'},
        {'msgid': 'a' * 33},
        {'hostname': 'a' * 256},
        {'app_name': 'a' * 49},
        {'procid': 'a' * 129},
    ],
)
def test_invalid_header_parts(kwargs):
    with pytest.raises(ValidationError):
        config(**kwargs)


def test_header_part_as_field_reference_is_not_length_checked():
    # The path of a reference is not the value it resolves to.
    cfg = config(hostname={'field': 'a' * 300})
    assert cfg.hostname.field == 'a' * 300


@pytest.mark.parametrize(
    ('part', 'limit'),
    [('hostname', 255), ('app_name', 48), ('procid', 128), ('msgid', 32)],
)
def test_header_part_from_event_keeps_the_rfc_limit(part, limit):
    event = json.dumps({'v': 'a' * (limit + 1)})

    with pytest.raises(FormatError, match='longer than'):
        render(event, **{part: {'field': 'v'}})

    assert 'a' * limit in render(
        json.dumps({'v': 'a' * limit}),
        **{part: {'field': 'v'}},
    )


def test_number_written_in_place_as_header_part():
    # A header part is text: the API relaxes the model to accept
    # placeholders and drops field validators doing so, so a coercion
    # here would hold in the config and not over the API.
    with pytest.raises(ValidationError):
        config(procid=1234)


def test_duplicate_structured_data_ids():
    with pytest.raises(ValidationError, match='unique'):
        config(structured_data=[{'id': 'x@1'}, {'id': 'x@1'}])


@pytest.mark.parametrize('value', [True, False, '6'])
def test_severity_written_in_place_is_a_name_or_a_number(value):
    with pytest.raises(ValidationError):
        config(severity=value)


def test_structured_data_value_with_control_character():
    with pytest.raises(ValidationError, match='control character'):
        config(structured_data=[{'id': 'x@1', 'params': {'a': 'a\nb'}}])


@pytest.mark.parametrize(
    'kwargs',
    [
        {'msgid': 'access'},
        {'structured_data': [{'id': 'origin@32473'}]},
        {'bom': True},
    ],
)
def test_rfc_3164_rejects_rfc_5424_fields(kwargs):
    with pytest.raises(ValidationError, match='RFC 3164'):
        config(rfc=3164, **kwargs)


def test_rfc_3164_accepts_its_own_fields():
    cfg = config(rfc=3164, hostname='web-01', app_name='sshd', procid='42')
    assert cfg.rfc == 3164


@pytest.mark.parametrize(
    'element',
    [
        {'id': 'has space'},
        {'id': 'has"quote'},
        {'id': 'has]bracket'},
        {'id': 'has=equals'},
        {'id': 'a' * 33},
        {'id': 'ok', 'params': {'has space': 'v'}},
        {'id': 'ok', 'params': {'has=equals': 'v'}},
        {'id': 'ok', 'params': {'a' * 33: 'v'}},
    ],
)
def test_invalid_structured_data(element):
    with pytest.raises(ValidationError):
        config(structured_data=[element])


# --- Field lookup tests ---


@pytest.mark.parametrize(
    ('path', 'expected'),
    [
        ('host.name', 'web-01'),
        ('process.pid', 4242),
        ('host', {'name': 'web-01'}),
        ('missing', None),
        ('host.missing', None),
        ('host.name.deeper', None),
        ('', None),
    ],
)
def test_lookup_field(path, expected):
    assert lookup_field(json.loads(EVENT), path) == expected


def test_lookup_field_mixed_nesting():
    data = {'log': {'syslog.facility.code': 16}}
    assert lookup_field(data, 'log.syslog.facility.code') == 16


def test_lookup_field_on_non_object():
    assert lookup_field(['a'], 'any') is None


# --- RFC 5424 rendering tests ---


def test_static_message():
    line = render(
        '{"a": 1}',
        facility='local0',
        severity='notice',
        hostname='web-01',
        app_name='nginx',
        procid='4242',
        msgid='access',
    )
    header, message = line.split(' - ', maxsplit=1)
    assert re.fullmatch(
        r'<133>1 \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?'
        r'(Z|[+-]\d{2}:\d{2}) web-01 nginx 4242 access',
        header,
    )
    assert message == '{"a": 1}'


def test_message_time_is_time_of_writing():
    line = render('{"a": 1}')
    rendered = line.split(' ')[1]
    written_at = datetime.fromisoformat(rendered)
    assert written_at.utcoffset() == datetime.now().astimezone().utcoffset()
    assert abs(datetime.now(tz=UTC) - written_at) < timedelta(minutes=1)


def test_all_parts_from_event():
    line = render(
        facility='local0',
        severity={'field': 'log.level'},
        hostname={'field': 'host.name'},
        app_name='nginx',
        procid={'field': 'process.pid'},
        msgid='access',
        timestamp={'field': '@timestamp'},
        message_field='message',
    )
    assert line == (
        '<131>1 2026-02-20T10:00:00.123456Z web-01 nginx 4242 access - '
        'GET /api/users 200'
    )


def test_missing_header_fields_render_as_nilvalue():
    line = render(
        hostname={'field': 'missing'},
        app_name={'field': 'missing'},
        procid={'field': 'missing'},
        msgid={'field': 'missing'},
        timestamp={'field': '@timestamp'},
        message_field='message',
    )
    assert line == (
        '<14>1 2026-02-20T10:00:00.123456Z - - - - - GET /api/users 200'
    )


@pytest.mark.parametrize(
    ('value', 'expected'),
    [
        ('2026-02-20T10:00:00+03:00', '2026-02-20T10:00:00+03:00'),
        ('2026-02-20T10:00:00Z', '2026-02-20T10:00:00Z'),
        ('2026-02-20T10:00:00+00:00', '2026-02-20T10:00:00Z'),
        (1771581600, '2026-02-20T10:00:00Z'),
        (1771581600.5, '2026-02-20T10:00:00.500000Z'),
    ],
)
def test_timestamp_values(value, expected):
    event = json.dumps({'ts': value})
    line = render(event, timestamp={'field': 'ts'})
    assert line.split(' ')[1] == expected


def test_naive_timestamp_takes_local_offset():
    event = json.dumps({'ts': '2026-02-20T10:00:00'})
    rendered = render(event, timestamp={'field': 'ts'}).split(' ')[1]
    assert datetime.fromisoformat(rendered).tzinfo is not None
    assert rendered.startswith('2026-02-20T10:00:00')


def test_message_format_json_compacts_event():
    event = '{\n  "a": 1\n}'
    line = render(event, message_format='json')
    assert line.endswith(' {"a":1}')


def test_message_from_object_field():
    line = render(message_field='host')
    assert line.endswith(' {"name":"web-01"}')


def test_message_from_numeric_field():
    line = render(message_field='process.pid')
    assert line.endswith(' 4242')


def test_bom_prepends_message():
    line = render('{"a": 1}', bom=True)
    assert line.endswith(' \ufeff{"a": 1}')


def test_empty_message_leaves_no_trailing_space():
    line = render('', message_field=None)
    assert line.endswith(' -')


def test_structured_data():
    line = render(
        structured_data=[
            {
                'id': 'origin@32473',
                'params': {'env': 'staging', 'ip': {'field': 'source.ip'}},
            },
            {'id': 'meta@32473', 'params': {'seq': '1'}},
        ],
        message_field='message',
    )
    assert (
        '[origin@32473 env="staging" ip="10.0.0.1"][meta@32473 seq="1"]'
        in (line)
    )


def test_structured_data_escaping():
    event = json.dumps({'v': 'a"b\\c]d'})
    line = render(
        event,
        structured_data=[{'id': 'x@1', 'params': {'p': {'field': 'v'}}}],
    )
    assert '[x@1 p="a\\"b\\\\c\\]d"]' in line


def test_structured_data_omits_missing_params():
    line = render(
        structured_data=[
            {
                'id': 'x@1',
                'params': {'a': {'field': 'missing'}, 'b': 'kept'},
            },
        ],
    )
    assert '[x@1 b="kept"]' in line


def test_structured_data_element_without_params():
    line = render(
        structured_data=[{'id': 'x@1', 'params': {'a': {'field': 'missing'}}}],
    )
    assert '[x@1]' in line


def test_facility_and_severity_from_event():
    event = json.dumps({'f': 'local7', 's': 2})
    line = render(event, facility={'field': 'f'}, severity={'field': 's'})
    assert line.startswith('<186>')


# --- RFC 3164 rendering tests ---


def test_rfc_3164():
    line = render(
        rfc=3164,
        facility='local0',
        severity='notice',
        hostname={'field': 'host.name'},
        app_name='sshd',
        procid={'field': 'process.pid'},
        timestamp={'field': '@timestamp'},
        message_field='message',
    )
    assert line == (
        '<133>Feb 20 10:00:00 web-01 sshd[4242]: GET /api/users 200'
    )


def test_rfc_3164_without_procid():
    line = render(
        rfc=3164,
        hostname='web-01',
        app_name='sshd',
        timestamp={'field': '@timestamp'},
        message_field='message',
    )
    assert line == '<14>Feb 20 10:00:00 web-01 sshd: GET /api/users 200'


def test_rfc_3164_without_tag():
    line = render(
        rfc=3164,
        hostname='web-01',
        procid='42',
        timestamp={'field': '@timestamp'},
        message_field='message',
    )
    assert line == '<14>Feb 20 10:00:00 web-01 GET /api/users 200'


def test_rfc_3164_pads_single_digit_day():
    event = json.dumps({'ts': '2026-02-05T09:08:07'})
    line = render(event, rfc=3164, timestamp={'field': 'ts'})
    assert line.startswith('<14>Feb  5 09:08:07 ')


def test_rfc_3164_keeps_wall_clock_of_the_event():
    event = json.dumps({'ts': '2026-02-20T10:00:00+09:00'})
    line = render(event, rfc=3164, timestamp={'field': 'ts'})
    assert line.startswith('<14>Feb 20 10:00:00 ')


# --- Error tests ---


def test_event_is_not_read_without_field_references():
    assert render('not json').endswith(' not json')


@pytest.mark.parametrize('event', ['not json', '[1, 2]', '"text"'])
def test_event_without_fields(event):
    with pytest.raises(FormatError, match='Cannot read fields'):
        render(event, hostname={'field': 'host.name'})


@pytest.mark.parametrize('value', ['nope', 24, None, True, ['a']])
def test_invalid_facility_from_event(value):
    event = json.dumps({'f': value})
    with pytest.raises(FormatError, match='facility'):
        render(event, facility={'field': 'f'})


@pytest.mark.parametrize('value', ['nope', 8, None, False, {'a': 1}])
def test_invalid_severity_from_event(value):
    event = json.dumps({'s': value})
    with pytest.raises(FormatError, match='severity'):
        render(event, severity={'field': 's'})


@pytest.mark.parametrize('value', ['not a time', None, True, ['a']])
def test_invalid_timestamp_from_event(value):
    event = json.dumps({'ts': value})
    with pytest.raises(FormatError, match='time'):
        render(event, timestamp={'field': 'ts'})


def test_header_part_with_space_from_event():
    event = json.dumps({'h': 'web 01'})
    with pytest.raises(FormatError, match='no syslog header part can carry'):
        render(event, hostname={'field': 'h'})


def test_header_part_of_non_scalar_from_event():
    with pytest.raises(FormatError, match='not a scalar'):
        render(hostname={'field': 'host'})


def test_missing_message_field():
    with pytest.raises(FormatError, match='does not carry field'):
        render(message_field='missing')


def test_message_format_json_of_invalid_json():
    with pytest.raises(FormatError, match='render event as JSON'):
        render('not json', message_format='json')


def test_error_carries_original_event():
    with pytest.raises(FormatError) as exc_info:
        render('not json', hostname={'field': 'host.name'})

    assert exc_info.value.original_event == 'not json'


def test_boolean_header_part_from_event():
    event = json.dumps({'b': True})
    assert ' true ' in render(event, hostname={'field': 'b'})


def test_empty_header_field_renders_as_nilvalue():
    # An absent field and a blank one are the same absence of a value.
    event = json.dumps({'h': ''})
    assert render(event, hostname={'field': 'h'}).split(' ')[2] == '-'


@pytest.mark.parametrize('value', [1_767_225_600_000, 1e20, -99_999_999_999])
def test_timestamp_out_of_range_from_event(value):
    event = json.dumps({'ts': value})

    with pytest.raises(FormatError, match='seconds since the epoch'):
        render(event, timestamp={'field': 'ts'})


def test_structured_data_value_with_control_character_from_event():
    event = json.dumps({'v': 'a\nb'})

    with pytest.raises(FormatError, match='control character'):
        render(
            event,
            structured_data=[{'id': 'x@1', 'params': {'p': {'field': 'v'}}}],
        )


def test_lookup_field_with_a_dotted_key_holding_an_object():
    assert lookup_field({'a.b': {'c': 1}}, 'a.b.c') == 1


def test_lookup_field_prefers_the_whole_path():
    assert lookup_field({'a.b': 1, 'a': {'b': 2}}, 'a.b') == 1


@pytest.mark.parametrize(
    ('facility', 'severity', 'pri'),
    [('16', '3', 131), ('local0', '3', 131), ('16', 'err', 131)],
)
def test_facility_and_severity_from_event_as_text(facility, severity, pri):
    event = json.dumps({'f': facility, 's': severity})
    line = render(event, facility={'field': 'f'}, severity={'field': 's'})
    assert line.startswith(f'<{pri}>')


@pytest.mark.parametrize('value', ['24', '99'])
def test_facility_from_event_out_of_range_as_text(value):
    event = json.dumps({'f': value})

    with pytest.raises(FormatError, match='facility'):
        render(event, facility={'field': 'f'})


@pytest.mark.parametrize(
    ('month', 'name'),
    [
        (1, 'Jan'),
        (2, 'Feb'),
        (3, 'Mar'),
        (4, 'Apr'),
        (5, 'May'),
        (6, 'Jun'),
        (7, 'Jul'),
        (8, 'Aug'),
        (9, 'Sep'),
        (10, 'Oct'),
        (11, 'Nov'),
        (12, 'Dec'),
    ],
)
def test_rfc_3164_month_names(month, name):
    event = json.dumps({'ts': f'2026-{month:02d}-15T09:08:07'})
    line = render(event, rfc=3164, timestamp={'field': 'ts'})
    assert line.startswith(f'<14>{name} 15 09:08:07 ')


def test_rfc_3164_empty_message_leaves_no_trailing_space():
    event = json.dumps({'ts': '2026-02-20T10:00:00', 'msg': ''})
    line = render(
        event,
        rfc=3164,
        hostname='web-01',
        app_name='sshd',
        timestamp={'field': 'ts'},
        message_field='msg',
    )
    assert line == '<14>Feb 20 10:00:00 web-01 sshd:'


def test_numeric_facility_and_severity_written_in_place():
    assert render('e', facility=16, severity=3).startswith('<131>')


def test_facility_from_event_is_case_insensitive():
    event = json.dumps({'f': 'LOCAL7'})
    assert render(event, facility={'field': 'f'}).startswith('<190>')


@pytest.mark.parametrize('value', [-1, 24, '-1', '24'])
def test_facility_from_event_out_of_range(value):
    event = json.dumps({'f': value})

    with pytest.raises(FormatError, match='facility'):
        render(event, facility={'field': 'f'})


@pytest.mark.parametrize('value', [-1, 8, '-1', '8'])
def test_severity_from_event_out_of_range(value):
    event = json.dumps({'s': value})

    with pytest.raises(FormatError, match='severity'):
        render(event, severity={'field': 's'})


def test_structured_data_escaping_of_a_value_written_in_place():
    line = render(
        'e',
        structured_data=[{'id': 'x@1', 'params': {'p': 'a"b\\c]d'}}],
    )
    assert line.endswith('[x@1 p="a\\"b\\\\c\\]d"] e')


def test_control_character_in_a_value_written_in_place():
    with pytest.raises(ValidationError, match='control character'):
        config(structured_data=[{'id': 'x@1', 'params': {'a': 'a\x7fb'}}])


def test_bom_prepends_a_message_taken_from_a_field():
    line = render(message_field='message')
    assert line.endswith(' GET /api/users 200')

    line = render(message_field='message', bom=True)
    assert line.endswith(' \ufeffGET /api/users 200')


def test_message_carrying_a_line_break_is_kept_as_it_is():
    # Nothing rewrites the message: octet counting is what carries a
    # message a delimiter cannot.
    event = json.dumps({'m': 'first\nsecond'})
    assert render(event, message_field='m').endswith(' first\nsecond')
