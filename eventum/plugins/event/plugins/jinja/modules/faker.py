"""Faker module."""

from faker import Faker


class _Locale:
    def __init__(self) -> None:
        self._dict: dict[str, Faker] = {}

    def __getitem__(self, locale: str) -> Faker:
        if locale in self._dict:
            return self._dict[locale]

        try:
            generator = Faker(locale=locale)
        except AttributeError:
            msg = f'Unknown locale "{locale}"'
            raise KeyError(msg) from None

        self._dict[locale] = generator
        return generator


locale = _Locale()
