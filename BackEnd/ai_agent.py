"""
Python 기반 AI Agent (Autonomous Intelligent Agent) 구현체
==========================================================
특징:
1. ReAct (Reasoning + Acting) 아키텍처:
   - 생각(Thought) -> 행동(Action / 도구 호출) -> 관찰(Observation) -> 최종 답변(Final Answer)
2. 외부 라이브러리 의존성 없이 표준 라이브러리만으로 즉시 실행 가능 (pip 설치 불필요)
3. 다중 LLM 백엔드 지원:
   - MockLLMProvider: API 키 없이도 즉시 체험 가능한 지능형 시뮬레이션 모드
   - OpenAICompatibleProvider: OpenAI, DeepSeek, Ollama, Groq 등 호환 REST API (urllib 사용)
   - GeminiProvider: Google Gemini REST API
4. 확장 가능한 도구(Tool) 등록 시스템 (@agent.tool 데코레이터)
5. 단기 기억(Memory) 관리 및 실시간 CLI 대화 인터페이스
"""

import os
import sys
import json
import inspect
import datetime
import urllib.request
import urllib.error
import ast
import operator
from typing import Callable, Dict, List, Any, Optional

# Windows 콘솔 인코딩 호환성 처리 (cp949 UnicodeEncodeError 방지)
if sys.platform.startswith("win"):
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass



# ==============================================================================
# 1. 안전한 계산기 유틸리티 (Safe Math Evaluator)
# ==============================================================================
class SafeMathEvaluator:
    """ast를 사용하여 위험한 eval 대신 안전하게 수학 수식을 계산하는 클래스"""
    _operators = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.FloorDiv: operator.floordiv,
        ast.Mod: operator.mod,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }

    @classmethod
    def evaluate(cls, expression: str) -> float:
        try:
            node = ast.parse(expression.strip(), mode='eval').body
            return cls._eval_node(node)
        except Exception as e:
            raise ValueError(f"수식 계산 오류: {str(e)}")

    @classmethod
    def _eval_node(cls, node):
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"지원하지 않는 값: {node.value}")
        elif isinstance(node, ast.BinOp):
            left = cls._eval_node(node.left)
            right = cls._eval_node(node.right)
            op = cls._operators.get(type(node.op))
            if not op:
                raise ValueError(f"지원하지 않는 연산자: {type(node.op)}")
            return op(left, right)
        elif isinstance(node, ast.UnaryOp):
            operand = cls._eval_node(node.operand)
            op = cls._operators.get(type(node.op))
            if not op:
                raise ValueError(f"지원하지 않는 단항 연산자: {type(node.op)}")
            return op(operand)
        raise ValueError("허용되지 않는 수식 형태입니다.")


# ==============================================================================
# 2. 도구(Tool) 및 레지스트리 시스템
# ==============================================================================
class Tool:
    """에이전트가 실행할 수 있는 단일 도구 정의"""
    def __init__(self, name: str, func: Callable, description: str):
        self.name = name
        self.func = func
        self.description = description
        self.signature = inspect.signature(func)

    def execute(self, **kwargs) -> Any:
        try:
            # 전달받은 인자 중 함수 시그니처에 맞는 것만 필터링하거나 변환
            bound = self.signature.bind_partial(**kwargs)
            bound.apply_defaults()
            return self.func(*bound.args, **bound.kwargs)
        except Exception as e:
            return f"[Tool Error in '{self.name}']: {str(e)}"

    def get_doc(self) -> str:
        params = []
        for param_name, param in self.signature.parameters.items():
            default = f"={param.default}" if param.default != inspect.Parameter.empty else ""
            params.append(f"{param_name}{default}")
        return f"- {self.name}({', '.join(params)}): {self.description}"


class ToolRegistry:
    """도구들을 관리하고 실행하는 레지스트리"""
    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, name: Optional[str] = None, description: Optional[str] = None):
        """함수를 도구로 등록하는 데코레이터"""
        def decorator(func: Callable):
            tool_name = name or func.__name__
            tool_desc = description or func.__doc__ or "설명 없음"
            self._tools[tool_name] = Tool(tool_name, func, tool_desc.strip())
            return func
        return decorator

    def get_tool(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def list_tools_description(self) -> str:
        if not self._tools:
            return "사용 가능한 도구가 없습니다."
        return "\n".join(tool.get_doc() for tool in self._tools.values())

    def execute(self, name: str, arguments: Dict[str, Any]) -> str:
        tool = self.get_tool(name)
        if not tool:
            return f"오류: '{name}' 도구를 찾을 수 없습니다."
        result = tool.execute(**arguments)
        return str(result)


# ==============================================================================
# 3. LLM 프로바이더 (Mock / OpenAI / Gemini)
# ==============================================================================
class BaseLLMProvider:
    """LLM 공급자 기본 인터페이스"""
    def generate(self, prompt: str, system_prompt: str) -> str:
        raise NotImplementedError


class MockLLMProvider(BaseLLMProvider):
    """
    API 키가 없어도 에이전트의 ReAct 동작 원리를 테스트할 수 있는 시뮬레이터.
    사용자의 질문 패턴을 분석해 실제 Thought -> Action -> Final Answer 사이클을 수행합니다.
    """
    def generate(self, prompt: str, system_prompt: str) -> str:
        lower_prompt = prompt.lower()

        # 도구 실행 결과(Observation)가 이미 프롬프트에 포함되어 있다면 최종 답변 반환
        if "observation:" in lower_prompt:
            last_obs = prompt.split("Observation:")[-1].strip()
            return f"Thought: 도구 실행 결과를 확인했습니다. 이를 바탕으로 사용자에게 명확히 답변하겠습니다.\nFinal Answer:\n{last_obs}"

        # 계산 관련 질의 감지
        if any(keyword in prompt for keyword in ["계산", "+", "-", "*", "/", "더하기", "곱하기", "나누기", "빼기"]):
            # 숫자와 연산자 추출 시도
            import re
            math_match = re.search(r'[\d\.\s\+\-\*\/\(\)\^]+', prompt)
            expression = math_match.group(0).strip() if math_match else "10 + 20"
            return (
                f"Thought: 사용자가 수학 계산을 요청했습니다. calculator 도구를 호출해 정확한 값을 구하겠습니다.\n"
                f"Action: calculator\n"
                f'Action Input: {{"expression": "{expression}"}}'
            )

        # 시간/날짜 관련 질의 감지
        if any(keyword in prompt for keyword in ["시간", "몇 시", "오늘 날짜", "현재 시각", "요일"]):
            return (
                "Thought: 현재 시간 또는 날짜에 대한 정보가 필요합니다. get_current_time 도구를 사용하겠습니다.\n"
                "Action: get_current_time\n"
                'Action Input: {}'
            )

        # 메모 관련 질의 감지
        if "메모" in prompt or "기록" in prompt:
            if any(k in prompt for k in ["읽어", "확인", "보여"]):
                return (
                    "Thought: 저장된 메모를 조회해야 합니다. read_memo 도구를 호출하겠습니다.\n"
                    "Action: read_memo\n"
                    'Action Input: {"key": "todo"}'
                )
            else:
                return (
                    "Thought: 사용자의 요청에 따라 메모를 기록합니다.\n"
                    "Action: write_memo\n"
                    f'Action Input: {{"key": "todo", "content": "{prompt.strip()}"}}'
                )

        # 강수 확률 / 날씨 예측 질의 감지
        if any(keyword in prompt for keyword in ["비올확률", "비 올 확률", "비올 확률", "비 올까", "비 오나요", "날씨 예측", "우산", "비가 올"]):
            loc = "서울"
            for city in ["부산", "제주", "대구", "대전", "광주", "인천", "강릉", "수원", "울산"]:
                if city in prompt:
                    loc = city
                    break
            import re
            date_match = re.search(r'(\d{1,2})\s*월\s*(\d{1,2})\s*일|\d{1,2}[-/]\d{1,2}', prompt)
            target_date = date_match.group(0) if date_match else "오늘"
            return (
                f"Thought: 과거 기상 데이터를 분석해 {loc}의 비 올 확률을 예측하겠습니다. predict_rain 도구를 호출합니다.\n"
                f"Action: predict_rain\n"
                f'Action Input: {{"location": "{loc}", "target_date": "{target_date}", "years_back": 5}}'
            )

        # 검색/지식 관련 질의
        if "검색" in prompt or "날씨" in prompt or "알려줘" in prompt:
            return (
                f"Thought: 질문에 대한 추가 정보를 얻기 위해 검색 도구를 사용합니다.\n"
                f"Action: search_web\n"
                f'Action Input: {{"query": "{prompt.strip()}"}}'
            )

        # 일반 대화일 경우 바로 Final Answer 반환
        return (
            "Thought: 추가적인 외부 도구 사용 없이 바로 답변할 수 있는 대화입니다.\n"
            f"Final Answer: 안녕하세요! 저는 Python 기반 자율형 AI Agent입니다. 질문: '{prompt.strip()}'에 대해 무엇을 도와드릴까요? "
            "(수학 계산, 현재 시간 조회, 메모 저장/조회, 웹 검색 도구를 사용할 수 있습니다.)"
        )


class OpenAICompatibleProvider(BaseLLMProvider):
    """
    OpenAI, DeepSeek, Ollama(로컬), vLLM 등 OpenAI 규격 엔드포인트를 지원하는 프로바이더.
    외부 라이브러리(openai) 설치 없이 urllib.request로 직접 통신합니다.
    """
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", base_url: str = "https://api.openai.com/v1"):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    def generate(self, prompt: str, system_prompt: str) -> str:
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }

        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8")
            return f"Thought: LLM API 호출 실패 (HTTP {e.code})\nFinal Answer: API 오류가 발생했습니다: {error_body}"
        except Exception as e:
            return f"Thought: LLM 연결 중 오류 발생\nFinal Answer: 연결 실패: {str(e)}"


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini API REST 엔드포인트를 지원하는 프로바이더.
    """
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model

    def generate(self, prompt: str, system_prompt: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}
        payload = {
            "systemInstruction": {"parts": [{"text": system_prompt}]},
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.2}
        }

        req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                result = json.loads(response.read().decode("utf-8"))
                candidates = result.get("candidates", [])
                if candidates:
                    return candidates[0]["content"]["parts"][0]["text"]
                return "Thought: 응답 없음\nFinal Answer: 응답을 생성하지 못했습니다."
        except Exception as e:
            return f"Thought: Gemini API 오류\nFinal Answer: Gemini 호출 오류: {str(e)}"


# ==============================================================================
# 4. 메모리 관리 (Conversation Memory)
# ==============================================================================
class AgentMemory:
    """대화 이력과 중간 컨텍스트를 저장 관리하는 메모리"""
    def __init__(self, max_history: int = 10):
        self.history: List[Dict[str, str]] = []
        self.max_history = max_history

    def add(self, role: str, content: str):
        self.history.append({"role": role, "content": content})
        if len(self.history) > self.max_history * 2:
            # 오래된 대화 정리
            self.history = self.history[-self.max_history * 2:]

    def get_context(self) -> str:
        formatted = []
        for msg in self.history:
            formatted.append(f"{msg['role'].capitalize()}: {msg['content']}")
        return "\n".join(formatted)

    def clear(self):
        self.history.clear()


# ==============================================================================
# 5. AIAgent 핵심 (ReAct 루프 실행기)
# ==============================================================================
REACT_SYSTEM_PROMPT = """너는 자율형 AI Agent이다.
주어진 도구(Tool)들을 활용하여 사용자의 질문을 해결해야 한다.

사용 가능한 도구 목록:
{tools}

반드시 다음 형식(Format)을 엄격히 지켜서 단계별로 답변하라:

Question: 사용자가 해결을 요청한 질문
Thought: 현재 상태를 분석하고 무엇을 해야 할지 논리적으로 생각한다.
Action: 사용하기로 결정한 도구 이름 (도구 목록에 있는 이름 중 하나만 정확히 입력)
Action Input: 도구에 전달할 인자를 JSON 포맷으로 작성 (예: {{"arg1": "val1"}})
Observation: 도구 실행 결과가 여기에 제공된다.
... (필요한 경우 Thought/Action/Action Input/Observation 과정을 반복)
Thought: 이제 최종 답변을 내릴 수 있는 충분한 정보를 얻었다.
Final Answer: 사용자를 위한 완성된 최종 답변을 작성한다.

규칙:
1. 추가 정보나 계산이 필요하면 반드시 Action을 호출하라.
2. 이미 결과를 알고 있거나 추가 행동이 불필요하면 바로 Final Answer를 출력하라.
"""

class AIAgent:
    """
    ReAct 패턴 기반의 자율 에이전트 클래스.
    """
    def __init__(self, llm_provider: Optional[BaseLLMProvider] = None, verbose: bool = True):
        self.registry = ToolRegistry()
        self.memory = AgentMemory()
        self.verbose = verbose

        # LLM 프로바이더 자동 선택 (환경변수에 따라 전환)
        if llm_provider:
            self.llm = llm_provider
        elif os.environ.get("OPENAI_API_KEY"):
            self.llm = OpenAICompatibleProvider(
                api_key=os.environ["OPENAI_API_KEY"],
                model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
                base_url=os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
            )
        elif os.environ.get("GEMINI_API_KEY"):
            self.llm = GeminiProvider(api_key=os.environ["GEMINI_API_KEY"])
        else:
            self.llm = MockLLMProvider()

    def tool(self, name: Optional[str] = None, description: Optional[str] = None):
        """에이전트 인스턴스에 도구를 등록하기 위한 간편 데코레이터"""
        return self.registry.register(name, description)

    def _parse_action(self, text: str) -> tuple[Optional[str], Optional[Dict[str, Any]]]:
        """LLM 출력에서 Action과 Action Input을 추출"""
        action = None
        action_input = {}

        lines = text.split("\n")
        for i, line in enumerate(lines):
            line_strip = line.strip()
            if line_strip.startswith("Action:"):
                action = line_strip[len("Action:"):].strip()
            elif line_strip.startswith("Action Input:"):
                raw_input = line_strip[len("Action Input:"):].strip()
                # 여러 줄에 걸친 JSON일 수 있으므로 나머지 줄 결합 시도
                full_input = "\n".join([raw_input] + [l for l in lines[i+1:] if not l.startswith("Observation:") and not l.startswith("Thought:")])
                try:
                    action_input = json.loads(raw_input)
                except json.JSONDecodeError:
                    try:
                        # 느슨한 파싱 시도 (dict 리터럴 등)
                        action_input = ast.literal_eval(raw_input)
                    except Exception:
                        action_input = {"input": raw_input}

        return action, action_input

    def run(self, user_query: str, max_iterations: int = 5) -> str:
        """사용자 요청을 입력받아 ReAct 루프를 통해 최종 응답을 도출"""
        if self.verbose:
            print(f"\n{'='*60}\n🤖 [Agent Started] 목표: {user_query}\n{'='*60}")

        tools_description = self.registry.list_tools_description()
        system_prompt = REACT_SYSTEM_PROMPT.format(tools=tools_description)

        current_prompt = f"Question: {user_query}\n"
        iteration = 0

        while iteration < max_iterations:
            iteration += 1

            # LLM 호출
            llm_output = self.llm.generate(current_prompt, system_prompt).strip()

            if self.verbose:
                print(f"\n--- [Iteration {iteration}] ---")
                print(llm_output)

            # Final Answer가 포함되어 있는지 확인
            if "Final Answer:" in llm_output:
                final_answer = llm_output.split("Final Answer:")[-1].strip()
                self.memory.add("user", user_query)
                self.memory.add("assistant", final_answer)
                if self.verbose:
                    print(f"\n🎯 [최종 완료]:\n{final_answer}\n{'='*60}")
                return final_answer

            # Action 파싱
            action, action_input = self._parse_action(llm_output)

            if not action:
                # 액션도 없고 Final Answer도 없으면 그냥 전체 텍스트 반환
                return llm_output

            if self.verbose:
                print(f"\n⚙️ [도구 실행]: '{action}' 인자: {action_input}")

            # 도구 실행
            observation = self.registry.execute(action, action_input)

            if self.verbose:
                print(f"👀 [관찰 결과]: {observation}")

            # 다음 턴을 위한 프롬프트 누적
            current_prompt += f"\n{llm_output}\nObservation: {observation}\n"

        fallback_msg = "최대 추론 반복 횟수(max_iterations)를 초과하여 작업을 완료하지 못했습니다."
        if self.verbose:
            print(f"\n⚠️ {fallback_msg}")
        return fallback_msg


# ==============================================================================
# 6. 기본 내장 도구들 정의
# ==============================================================================
def setup_default_tools(agent: AIAgent):
    """에이전트에 실용적인 기본 도구들을 장착합니다."""

    @agent.tool(
        name="calculator",
        description="수학 수식을 안전하게 계산합니다. 사칙연산, 거듭제곱 등을 지원합니다. (예: expression='(125 * 4) / 5')"
    )
    def calculator(expression: str) -> str:
        try:
            result = SafeMathEvaluator.evaluate(expression)
            return f"{expression} = {result}"
        except Exception as e:
            return f"계산 실패: {e}"

    @agent.tool(
        name="get_current_time",
        description="현재 날짜, 요일 및 시간을 확인합니다."
    )
    def get_current_time() -> str:
        now = datetime.datetime.now()
        weekdays = ["월", "화", "수", "목", "금", "토", "일"]
        return now.strftime(f"%Y년 %m월 %d일 ({weekdays[now.weekday()]}요일) %H시 %M분 %S초")

    # 인메모리 메모장 데이터베이스
    in_memory_notes: Dict[str, str] = {}

    @agent.tool(
        name="write_memo",
        description="중요한 정보나 할 일을 메모장에 저장합니다. (예: key='todo', content='파이썬 공부하기')"
    )
    def write_memo(key: str, content: str) -> str:
        in_memory_notes[key] = content
        return f"성공적으로 저장되었습니다: [{key}] -> '{content}'"

    @agent.tool(
        name="read_memo",
        description="메모장에 저장된 특정 키의 내용을 조회합니다. (예: key='todo')"
    )
    def read_memo(key: str) -> str:
        if key in in_memory_notes:
            return f"[{key}] 메모 내용: {in_memory_notes[key]}"
        return f"'{key}' 키에 해당하는 메모가 없습니다. (현재 등록된 키: {list(in_memory_notes.keys())})"

    @agent.tool(
        name="search_web",
        description="인터넷 정보나 지식을 검색합니다. (검색어 query 전달)"
    )
    def search_web(query: str) -> str:
        # 내장 시뮬레이션 지식 베이스
        knowledge_base = {
            "날씨": "서울 기준 현재 날씨는 맑음이며, 기온은 영상 18도, 습도는 45%입니다.",
            "파이썬": "Python은 가독성이 높고 다양한 오픈소스 생태계를 갖춘 다목적 고급 프로그래밍 언어입니다.",
            "ai agent": "AI Agent는 환경을 인식(Perceive)하고, 추론(Reason)하여, 목표를 달성하기 위해 자율적으로 행동(Act)하는 지능형 시스템입니다.",
        }
        for k, v in knowledge_base.items():
            if k in query.lower():
                return f"[검색 결과 - {k}]: {v}"
        return f"'{query}'에 대한 최신 검색 결과: 관련된 최신 기술 동향 및 문서가 요약되었습니다."

    # 기상 데이터 기반 강수 확률 예측 도구 연동
    try:
        from BackEnd.weather_predictor import predict_rain_tool

        @agent.tool(
            name="predict_rain",
            description="특정 지역의 과거 n개년 기상 데이터를 바탕으로 비 올 확률(%), 예상 날씨 상태, 우산 지수를 예측합니다. (location='지역명', target_date='MM-DD' 또는 'X월 X일', years_back=5)"
        )
        def predict_rain(location: str = "서울", target_date: str = "오늘", years_back: int = 5) -> str:
            return predict_rain_tool(location=location, target_date=target_date, years_back=years_back)
    except Exception as e:
        pass


# ==============================================================================
# 7. 실행 및 CLI 대화형 인터페이스
# ==============================================================================
def main():
    agent = AIAgent(verbose=True)
    setup_default_tools(agent)

    print("\n" + "=" * 65)
    print(" 🚀 Python 자율형 AI Agent (AIA) 시스템에 오신 것을 환영합니다!")
    print("=" * 65)
    print(" 현재 실행 모드: ", type(agent.llm).__name__)
    if isinstance(agent.llm, MockLLMProvider):
        print(" 💡 안내: API 키가 설정되지 않아 내장 'MockLLM' 시뮬레이션 모드로 작동합니다.")
        print("    실제 LLM(OpenAI/DeepSeek/Gemini 등)을 연결하려면 다음 환경변수를 설정하세요:")
        print("    - OpenAI: $env:OPENAI_API_KEY='sk-...'")
        print("    - Gemini: $env:GEMINI_API_KEY='AIza...'")
    print("-" * 65)
    print(" 등록된 도구 목록:")
    print(agent.registry.list_tools_description())
    print("-" * 65)
    print(" 💡 테스트 추천 명령어:")
    print("    1. 1540 * 25 계산해줘")
    print("    2. 지금 몇 시야?")
    print("    3. 오늘 장보기 리스트 메모해줘")
    print("    4. 파이썬에 대해 검색해줘")
    print("    5. 서울 7월 15일 비 올 확률 예측해줘")
    print("    6. 제주 8월 10일 비 올까?")
    print("    7. '종료' 또는 'exit' 입력 시 프로그램 종료")
    print("=" * 65 + "\n")

    while True:
        try:
            user_input = input("\n👤 사용자 질문 입력 > ").strip()
            if not user_input:
                continue
            if user_input.lower() in ["exit", "quit", "종료", "q"]:
                print("👋 AI Agent를 종료합니다. 감사합니다!")
                break

            agent.run(user_input)

        except KeyboardInterrupt:
            print("\n👋 프로그램을 중단합니다.")
            break
        except Exception as e:
            print(f"❌ 오류 발생: {e}")


if __name__ == "__main__":
    main()
