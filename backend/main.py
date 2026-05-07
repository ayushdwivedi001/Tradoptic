from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from nse_scraper import scraper_instance

app = FastAPI(title="NSE Live Dashboard API")

# Configure CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    scraper_instance.start()

@app.on_event("shutdown")
def shutdown_event():
    scraper_instance.stop()

@app.get("/api/market/nifty50")
def get_nifty50():
    if not scraper_instance.nifty_data:
        # Provide some dummy fallback data if NSE is blocking during dev
        # return {"status": "error", "message": "Data not available yet or blocked."}
        pass
        
    return {
        "status": "success",
        "last_updated": scraper_instance.last_updated,
        "data": scraper_instance.nifty_data
    }

@app.get("/api/options/{index_symbol}")
def get_options(index_symbol: str):
    options = scraper_instance.options_data.get(index_symbol.upper())
    if not options or not options.get("df"):
        return {"status": "error", "message": "Data not available."}
        
    return {
        "status": "success",
        "last_updated": scraper_instance.last_updated,
        "underlying": options["underlying_val"],
        "data": options["df"]
    }

@app.get("/api/signals")
def get_signals():
    return {
        "status": "success",
        "data": scraper_instance.trading_signals
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
