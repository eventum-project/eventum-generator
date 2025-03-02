from abc import ABC, abstractmethod
from copy import deepcopy
from threading import RLock
from typing import Any


class State(ABC):
    """Base key-value state."""

    @abstractmethod
    def get(self, key: str, default: Any = None) -> Any:
        """Get value from state.

        Parameters
        ----------
        key : str
            Key of the value to get

        default : Any, default=None
            Default value to return if there is no value in state with
            specified key

        Returns
        -------
        Any
            Value from the state, or default value if there is no value
            in state with specified key
        """
        ...

    @abstractmethod
    def set(self, key: str, value: Any) -> None:
        """Set value to state.

        Parameters
        ----------
        key : str
            Key of the value to set

        value : Any
            Value to set
        """
        ...

    @abstractmethod
    def update(self, m: dict[str, Any], /) -> None:
        """Update state with new values.

        Parameters
        ----------
        key : str
            Key of the value to set

        value : Any
            Value to set
        """

    @abstractmethod
    def clear(self) -> None:
        """Clear state."""
        ...

    @abstractmethod
    def as_dict(self) -> dict[str, Any]:
        """Get dictionary representation of state."""
        ...

    @abstractmethod
    def __getitem__(self, key: Any) -> Any:
        ...


class SingleThreadState(State):
    """Key-value state for single thread.

    Parameters
    ----------
    initial : dict[str, Any] | None = None
        Initial state
    """

    __slots__ = ('_state', )

    def __init__(self, initial: dict[str, Any] | None = None) -> None:
        self._state: dict[str, Any] = initial or dict()

    def get(self, key: str, default: Any | None = None) -> Any:
        return self._state.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self._state[key] = value

    def update(self, m: dict[str, Any], /) -> None:
        self._state.update(m)

    def clear(self) -> None:
        self._state.clear()

    def as_dict(self) -> dict[str, Any]:
        return deepcopy(self._state)

    def __getitem__(self, key: Any) -> Any:
        return self.get(key)

    def __setitem__(self, key: Any, value: Any) -> None:
        self.set(key=key, value=value)


class MultiThreadState(State):
    """Thread-safe key-value state.

    Parameters
    ----------
    initial : dict[str, Any] | None = None
        Initial state
    """

    def __init__(
        self,
        lock: RLock,
        initial: dict[str, Any] | None = None
    ) -> None:
        self._lock = lock

        self._state: dict[str, Any] = initial or dict()
        self._state_to_update: dict[str, Any] = dict()

    def get(self, key: str, default: Any | None = None) -> Any:
        with self._lock:
            return self._state.get(key, default)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._state[key] = value

    def update(self, m: dict[str, Any], /) -> None:
        with self._lock:
            self._state.update(m)

    def clear(self) -> None:
        with self._lock:
            self._state.clear()

    def as_dict(self) -> dict[str, Any]:
        with self._lock:
            return deepcopy(self._state)

    def acquire(self) -> None:
        """Acquire state lock."""
        self._lock.acquire()

    def release(self) -> None:
        """Release state lock."""
        self._lock.release()

    def __getitem__(self, key: Any) -> Any:
        with self._lock:
            return self.get(key)
