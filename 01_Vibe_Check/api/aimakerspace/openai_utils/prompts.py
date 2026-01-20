import re
from typing import Dict, List, Any, Optional


class BasePrompt:
    def __init__(self, prompt: str, strict: bool = False, defaults: Optional[Dict[str, Any]] = None):
        self.prompt = prompt
        self.strict = strict
        self.defaults = defaults or {}
        self._pattern = re.compile(r"\{([^}]+)\}")

    def format_prompt(self, **kwargs) -> str:
        variables = self.get_input_variables()
        merged_kwargs = {**self.defaults, **kwargs}
        format_dict = {var: merged_kwargs.get(var, self.defaults.get(var, "")) for var in variables}
        return self.prompt.format(**format_dict)

    def get_input_variables(self) -> List[str]:
        return self._pattern.findall(self.prompt)


class RolePrompt(BasePrompt):
    VALID_ROLES = {"system", "user", "assistant"}
    
    def __init__(self, prompt: str, role: str, strict: bool = False, defaults: Optional[Dict[str, Any]] = None):
        if role not in self.VALID_ROLES:
            raise ValueError(f"Invalid role: {role}. Must be one of {self.VALID_ROLES}")
        super().__init__(prompt, strict=strict, defaults=defaults)
        self.role = role

    def create_message(self, **kwargs) -> Dict[str, str]:
        return {"role": self.role, "content": self.format_prompt(**kwargs)}


class SystemRolePrompt(RolePrompt):
    def __init__(self, prompt: str, strict: bool = False, defaults: Optional[Dict[str, Any]] = None):
        super().__init__(prompt, "system", strict=strict, defaults=defaults)


class UserRolePrompt(RolePrompt):
    def __init__(self, prompt: str, strict: bool = False, defaults: Optional[Dict[str, Any]] = None):
        super().__init__(prompt, "user", strict=strict, defaults=defaults)


class AssistantRolePrompt(RolePrompt):
    def __init__(self, prompt: str, strict: bool = False, defaults: Optional[Dict[str, Any]] = None):
        super().__init__(prompt, "assistant", strict=strict, defaults=defaults)
