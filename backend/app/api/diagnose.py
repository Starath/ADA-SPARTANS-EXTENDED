from fastapi import APIRouter, HTTPException
from app.agents.graph import diagnosis_graph, AgentState
from app.models.schemas import DiagnoseRequest, DiagnosisResult

router = APIRouter()


@router.post("/diagnose", response_model=DiagnosisResult)
async def diagnose(request: DiagnoseRequest):
    if not request.handwriting and not request.transcript:
        raise HTTPException(
            status_code=400,
            detail="At least one of handwriting or transcript must be provided",
        )

    initial_state: AgentState = {
        "handwriting": request.handwriting,
        "transcript": request.transcript,
        "child_age": request.child_age,
        "child_grade": request.child_grade,
        "context": "",
        "raw_diagnosis": None,
        "critique": None,
        "final_report": None,
    }

    result = await diagnosis_graph.ainvoke(initial_state)
    if not result.get("final_report"):
        raise HTTPException(status_code=500, detail="Diagnosis pipeline failed")

    return result["final_report"]
