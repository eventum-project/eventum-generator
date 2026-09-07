"""Contracts shared with the output plugin forms in Studio."""

import json
from pathlib import Path
from typing import Any

from eventum.plugins.output.base.config import OutputPluginConfig
from eventum.plugins.output.plugins.clickhouse.config import (
    ClickhouseOutputPluginConfig,
)
from eventum.plugins.output.plugins.file.config import FileOutputPluginConfig
from eventum.plugins.output.plugins.http.config import HttpOutputPluginConfig
from eventum.plugins.output.plugins.kafka.config import KafkaOutputPluginConfig
from eventum.plugins.output.plugins.opensearch.config import (
    OpensearchOutputPluginConfig,
)
from eventum.plugins.output.plugins.otlp.config import OtlpOutputPluginConfig
from eventum.plugins.output.plugins.s3.config import S3OutputPluginConfig
from eventum.plugins.output.plugins.stdout.config import (
    StdoutOutputPluginConfig,
)
from eventum.plugins.output.plugins.tcp.config import TcpOutputPluginConfig
from eventum.plugins.output.plugins.udp.config import UdpOutputPluginConfig

_FRONTEND_DEFAULTS_PATH = (
    Path(__file__).parents[3]
    / 'ui/src/api/routes/generator-configs/modules/plugins/'
    'output-plugin-default-formatters.json'
)

_OUTPUT_CONFIG_TYPES: dict[str, type[OutputPluginConfig]] = {
    'clickhouse': ClickhouseOutputPluginConfig,
    'file': FileOutputPluginConfig,
    'http': HttpOutputPluginConfig,
    'kafka': KafkaOutputPluginConfig,
    'opensearch': OpensearchOutputPluginConfig,
    'otlp': OtlpOutputPluginConfig,
    's3': S3OutputPluginConfig,
    'stdout': StdoutOutputPluginConfig,
    'tcp': TcpOutputPluginConfig,
    'udp': UdpOutputPluginConfig,
}


def _formatter_default(
    config_type: type[OutputPluginConfig],
) -> dict[str, Any]:
    formatter = config_type.model_fields['formatter'].get_default(
        call_default_factory=True,
    )
    assert formatter is not None
    return formatter.model_dump(mode='json', exclude_none=True)


def test_frontend_formatter_defaults_match_backend() -> None:
    """Keep previews equal to implicit output plugin formatting."""
    frontend_defaults = json.loads(_FRONTEND_DEFAULTS_PATH.read_text())
    backend_defaults = {
        name: _formatter_default(config_type)
        for name, config_type in _OUTPUT_CONFIG_TYPES.items()
    }

    assert frontend_defaults == backend_defaults
