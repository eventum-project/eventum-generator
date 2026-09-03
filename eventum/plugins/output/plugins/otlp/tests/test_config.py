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
