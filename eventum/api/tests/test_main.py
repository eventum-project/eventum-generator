from unittest.mock import MagicMock

import pytest
from fastapi import FastAPI

import eventum.api.routers as routes
from eventum.api.main import build_api_app
from eventum.utils.package_utils import get_subpackage_names


def test_build_api_app():
    mock_manager = MagicMock()
    mock_settings = MagicMock()

    app = build_api_app(generator_manager=mock_manager, settings=mock_settings)

    assert isinstance(app, FastAPI)


def test_api_app_state():
    mock_manager = MagicMock()
    mock_settings = MagicMock()

    app = build_api_app(generator_manager=mock_manager, settings=mock_settings)

    assert app.state.generator_manager is mock_manager
    assert app.state.settings is mock_settings
