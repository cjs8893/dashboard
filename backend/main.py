import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, text
import pandas as pd

app = FastAPI(title="Universal SQL Dashboard API")

# Enable CORS so your live Vercel frontend can talk to your Render backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    connection_string: str
    sql: str

@app.get("/")
def health_check():
    return {"status": "healthy", "message": "API is operational."}

@app.post("/api/execute")
async def execute_query(request: QueryRequest):
    # Read-only guard rail for portfolio safety
    forbidden_keywords = ["drop", "delete", "truncate", "alter", "grant", "revoke"]
    if any(keyword in request.sql.lower() for keyword in forbidden_keywords):
        raise HTTPException(
            status_code=400, 
            detail="Write operations are forbidden. Read-only queries only."
        )

    try:
        # Dynamically connect to the user's target database
        engine = create_engine(request.connection_string, connect_args={"connect_timeout": 5})
        
        with engine.connect() as conn:
            df = pd.read_sql_query(text(request.sql), conn)
            df = df.fillna("")  # Avoid JSON serialization errors with nulls
            
            return {
                "columns": list(df.columns),
                "records": df.to_dict(orient="records")
            }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Database Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
    