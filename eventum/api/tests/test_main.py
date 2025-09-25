from unittest.mock import MagicMock

from fastapi import FastAPI

from eventum.api.main import build_api_app


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
