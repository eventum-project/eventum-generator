import mimesis.enums as enums
import mimesis.random as random
import pytest
from mimesis import Generic
from mimesis.builtins import (
    BrazilSpecProvider,
    DenmarkSpecProvider,
    ItalySpecProvider,
    NetherlandsSpecProvider,
    PolandSpecProvider,
    RussiaSpecProvider,
    UkraineSpecProvider,
    USASpecProvider,
)

import eventum.plugins.event.plugins.jinja.modules.mimesis as mimesis


# ---- Test _Locale ----
def test_locale_instance():
    assert isinstance(mimesis.locale, mimesis._Locale)


def test_locale_caching():
    generator1 = mimesis.locale['en']
    generator2 = mimesis.locale['en']

    assert isinstance(generator1, Generic)
    assert generator1 is generator2  # Cached instance


def test_locale_different_instances():
    generator_en = mimesis.locale['en']
    generator_fr = mimesis.locale['fr']

    assert isinstance(generator_en, Generic)
    assert isinstance(generator_fr, Generic)
    assert generator_en is not generator_fr


def test_locale_invalid_locale():
    with pytest.raises(KeyError):
        mimesis.locale['invalid-locale']


# ---- Test _Spec ----
def test_spec_instance():
    assert isinstance(mimesis.spec, mimesis._Spec)


def test_spec_caching():
    spec1 = mimesis.spec['russia']
    spec2 = mimesis.spec['russia']

    assert isinstance(spec1, RussiaSpecProvider)
    assert spec1 is spec2  # Cached instance


def test_spec_valid():
    assert isinstance(mimesis.spec['brazil'], BrazilSpecProvider)
    assert isinstance(mimesis.spec['denmark'], DenmarkSpecProvider)
    assert isinstance(mimesis.spec['italy'], ItalySpecProvider)
    assert isinstance(mimesis.spec['netherlands'], NetherlandsSpecProvider)
    assert isinstance(mimesis.spec['poland'], PolandSpecProvider)
    assert isinstance(mimesis.spec['russia'], RussiaSpecProvider)
    assert isinstance(mimesis.spec['ukraine'], UkraineSpecProvider)
    assert isinstance(mimesis.spec['usa'], USASpecProvider)


def test_spec_invalid():
    with pytest.raises(KeyError):
        mimesis.spec['invalid']


# ---- Test enums and random import ----
def test_enums_import():
    assert mimesis.enums is enums


def test_random_import():
    assert mimesis.random is random
