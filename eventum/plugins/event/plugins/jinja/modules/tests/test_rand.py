import datetime as dt
import ipaddress
import uuid
from string import (
    ascii_letters,
    ascii_lowercase,
    ascii_uppercase,
    digits,
    punctuation,
)

import pytest

import eventum.plugins.event.plugins.jinja.modules.rand as rand


# ---- General Random Functions ----
def test_shuffle():
    items = [1, 2, 3, 4, 5]
    shuffled = rand.shuffle(items)
    assert sorted(shuffled) == sorted(items)

    text = 'abcdef'
    shuffled_text = rand.shuffle(text)
    assert sorted(shuffled_text) == sorted(text)


def test_choice():
    items = ['a', 'b', 'c']
    assert rand.choice(items) in items

    with pytest.raises(IndexError):
        rand.choice([])


def test_choices():
    items = ['x', 'y', 'z']
    results = rand.choices(items, 5)
    assert len(results) == 5
    assert all(item in items for item in results)


def test_weighted_choice():
    items = ['apple', 'banana', 'cherry']
    weights = [0.1, 0.2, 0.7]
    result = rand.weighted_choice(items, weights)
    assert result in items


def test_weighted_choices():
    items = ['red', 'green', 'blue']
    weights = [0.5, 0.3, 0.2]
    results = rand.weighted_choices(items, weights, 5)
    assert len(results) == 5
    assert all(item in items for item in results)


# ---- Number Namespace ----
def test_number_integer():
    value = rand.number.integer(1, 10)
    assert 1 <= value <= 10


def test_number_floating():
    value = rand.number.floating(1.5, 5.5)
    assert 1.5 <= value <= 5.5


def test_number_gauss():
    value = rand.number.gauss(0, 1)
    assert isinstance(value, float)


# ---- String Namespace ----
def test_string_letters_lowercase():
    result = rand.string.letters_lowercase(10)
    assert len(result) == 10
    assert all(c in ascii_lowercase for c in result)


def test_string_letters_uppercase():
    result = rand.string.letters_uppercase(10)
    assert len(result) == 10
    assert all(c in ascii_uppercase for c in result)


def test_string_letters():
    result = rand.string.letters(10)
    assert len(result) == 10
    assert all(c in ascii_letters for c in result)


def test_string_digits():
    result = rand.string.digits(5)
    assert len(result) == 5
    assert all(c in digits for c in result)


def test_string_punctuation():
    result = rand.string.punctuation(5)
    assert len(result) == 5
    assert all(c in punctuation for c in result)


def test_string_hex():
    result = rand.string.hex(8)
    assert len(result) == 8
    assert all(c in '0123456789abcdef' for c in result)


# ---- Network Namespace ----
def test_ip_v4():
    ip = rand.network.ip_v4()
    assert isinstance(ipaddress.ip_address(ip), ipaddress.IPv4Address)


def test_ip_v4_private_a():
    ip = rand.network.ip_v4_private_a()
    assert ip.startswith('10.')


def test_ip_v4_private_b():
    ip = rand.network.ip_v4_private_b()
    assert ip.startswith('172.') and 16 <= int(ip.split('.')[1]) <= 31


def test_ip_v4_private_c():
    ip = rand.network.ip_v4_private_c()
    assert ip.startswith('192.168.')


def test_ip_v4_public():
    ip = rand.network.ip_v4_public()
    assert isinstance(ipaddress.ip_address(ip), ipaddress.IPv4Address)


def test_mac():
    mac = rand.network.mac()
    assert len(mac.split(':')) == 6
    assert all(0 <= int(x, 16) <= 255 for x in mac.split(':'))


# ---- Crypto Namespace ----
def test_uuid4():
    assert isinstance(uuid.UUID(rand.crypto.uuid4()), uuid.UUID)


def test_md5():
    result = rand.crypto.md5()
    assert len(result) == 32
    assert all(c in '0123456789abcdef' for c in result)


def test_sha256():
    result = rand.crypto.sha256()
    assert len(result) == 64
    assert all(c in '0123456789abcdef' for c in result)


# ---- Datetime Namespace ----
def test_timestamp():
    start = '2022-01-01T00:00:00'
    end = '2023-01-01T00:00:00'
    ts = rand.datetime.timestamp(start, end)
    ts_dt = dt.datetime.fromisoformat(ts)

    start_dt = dt.datetime.fromisoformat(start)
    end_dt = dt.datetime.fromisoformat(end)

    assert start_dt <= ts_dt <= end_dt
