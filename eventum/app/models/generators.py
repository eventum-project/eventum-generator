"""Model for the list of generators."""

from collections.abc import Sequence

from flatten_dict import flatten, unflatten  # type: ignore[import-untyped]
from pydantic import Field, RootModel

from eventum.core.parameters import GenerationParameters, GeneratorParameters


class GeneratorsParameters(RootModel, frozen=True):
    """List of generators."""

    root: tuple[GeneratorParameters, ...] = Field(min_length=1)

    @classmethod
    def build_over_generation_parameters(
        cls,
        object: Sequence[dict],
        generation_parameters: GenerationParameters,
    ) -> 'GeneratorsParameters':
        """Build `Generators` instance using sequence of generators
        parameters that are going to be combined with base generation
        settings from `GenerationParameters` object.

        Parameters
        ----------
        object : Sequence[dict]
            Sequence of generator parameters.

        generation_parameters : GenerationParameters
            Base generation parameters.

        Returns
        -------
        GeneratorsParameters
            Generators parameters.

        Raises
        ------
        ValidationError
            If object cannot be validated.

        """
        generators: list[GeneratorParameters] = []
        base_params = generation_parameters.model_dump()
        base_params = flatten(base_params, reducer='dot')

        for params in object:
            generator_params = flatten(params, reducer='dot')

            generator_params = base_params | generator_params
            generator_params = unflatten(generator_params, splitter='dot')

            validated_generator_params = GeneratorParameters.model_validate(
                generator_params,
            )

            generators.append(validated_generator_params)

        return GeneratorsParameters(root=tuple(generators))
