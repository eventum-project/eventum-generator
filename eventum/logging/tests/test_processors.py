# type: ignore
import logging

import pytest

from eventum.logging.processors import derive_extras, remove_keys_processor


def test_derive_extras_adds_to_kwargs():
    def fake_processor(logger, method_name, event_dict):
        return (event_dict,), {}

    wrapped = derive_extras(['user', 'req_id'])(fake_processor)

    event_dict = {'event': 'test', 'user': 'alice', 'req_id': '123'}
    _, log_kwargs = wrapped(None, None, event_dict)

    assert 'extra' in log_kwargs
    assert log_kwargs['extra']['user'] == 'alice'
    assert log_kwargs['extra']['req_id'] == '123'


def test_derive_extras_skips_missing_keys():
    def fake_processor(logger, method_name, event_dict):
        return (event_dict,), {'extra': {}}

    wrapped = derive_extras(['not_here'])(fake_processor)

    event_dict = {'event': 'test'}
    _, log_kwargs = wrapped(None, None, event_dict)

    assert 'extra' in log_kwargs
    assert log_kwargs['extra'] == {}


def test_derive_extras_invalid_last_processor():
    def bad_processor(logger, method_name, event_dict):
        return {'event': 'oops'}

    wrapped = derive_extras(['foo'])(bad_processor)

    with pytest.raises(TypeError, match='wrap_for_formatter'):
        wrapped(None, None, {'foo': 'bar'})


def test_remove_keys_processor_removes_keys():
    proc = remove_keys_processor(['secret', 'debug'])

    event_dict = {'event': 'ok', 'secret': 's3cr3t', 'debug': True}
    result = proc(logging.getLogger(), 'info', event_dict)

    assert 'secret' not in result
    assert 'debug' not in result
    assert result == {'event': 'ok'}


def test_remove_keys_processor_missing_keys_is_safe():
    proc = remove_keys_processor(['not_present'])

    event_dict = {'event': 'ok'}
    result = proc(logging.getLogger(), 'info', dict(event_dict))  # copy
    assert result == {'event': 'ok'}  # unchanged
    assert result == {'event': 'ok'}  # unchanged
