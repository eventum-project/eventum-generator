"""Mimesis module."""

import mimesis.enums as _enums
import mimesis.random as _random
from mimesis import BaseDataProvider, Generic, Locale
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


class _Locale:
    def __init__(self) -> None:
        self._dict: dict[str, Generic] = {}

    def __getitem__(self, locale: str) -> Generic:
        if locale in self._dict:
            return self._dict[locale]
        try:
            generator = Generic(Locale(locale))
        except ValueError:
            msg = f'Unknown locale "{locale}"'
            raise KeyError(msg) from None

        self._dict[locale] = generator
        return generator


class _Spec:
    def __init__(self) -> None:
        self._dict: dict[str, BaseDataProvider] = {}

    def __getitem__(self, spec_name: str) -> BaseDataProvider:
        if spec_name in self._dict:
            return self._dict[spec_name]

        try:
            spec: BaseDataProvider = {
                'brazil': BrazilSpecProvider(),
                'denmark': DenmarkSpecProvider(),
                'italy': ItalySpecProvider(),
                'netherlands': NetherlandsSpecProvider(),
                'poland': PolandSpecProvider(),
                'russia': RussiaSpecProvider(),
                'ukraine': UkraineSpecProvider(),
                'usa': USASpecProvider(),
            }[spec_name]
        except KeyError as e:
            msg = f'Unknown spec "{e}"'
            raise KeyError(msg) from None

        self._dict[spec_name] = spec
        return spec


enums = _enums
random = _random

locale = _Locale()
spec = _Spec()
