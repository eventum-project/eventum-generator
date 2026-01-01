import pytest
from faker import Faker

import eventum.plugins.event.plugins.template.modules.faker as faker


# ---- Test _Locale ----
def test_locale_instance():
    assert isinstance(faker.locale, faker._Locale)


def test_locale_caching():
    generator1 = faker.locale['en_US']
    generator2 = faker.locale['en_US']

    assert isinstance(generator1, Faker)
    assert generator1 is generator2  # Cached instance


def test_locale_different_instances():
    generator_en = faker.locale['en_US']
    generator_fr = faker.locale['fr_FR']

    assert isinstance(generator_en, Faker)
    assert isinstance(generator_fr, Faker)
    assert generator_en is not generator_fr


def test_locale_invalid_locale():
    with pytest.raises(KeyError):
        faker.locale['invalid-locale']
