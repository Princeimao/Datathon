import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileSearch, Search, ShieldCheck } from "lucide-react";
import { api } from "../services/api";

const example =
  "A bike KA01AB1234 was stolen near KR Market. Informer says the same bike was seen in an ATM loot case. A stolen phone 9876543210 was found in the pocket of an unidentified dead person.";

export default function SimilarityWorkbench() {
  const [statement, setStatement] = useState(example);
  const [incidentId, setIncidentId] = useState("");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");

  async function runPrediction() {
    setStatus("Checking without changing records");
    try {
      const response = await api.predictSimilarity({
        statement,
        incidentId: incidentId || undefined,
        limit: 20,
      });
      setResult(response);
      setStatus("");
    } catch (err) {
      setStatus(err.message);
    }
  }

  async function applyAction(action) {
    setStatus("Applying confirmed action");
    try {
      await api.applySimilarity(action);
      setStatus("Confirmed action applied");
    } catch (err) {
      setStatus(err.message);
    }
  }

  return (
    <div className="similarity-layout">
      <section className="panel wide">
        <div className="panel-heading">
          <div>
            <h3>Case Similarity Prediction</h3>
            <p>Paste a culprit statement, informer tip, or evidence note. The backend checks possible links without modifying source records.</p>
          </div>
          <FileSearch size={22} />
        </div>

        <div className="statement-form">
          <label>
            Context incident ID
            <input value={incidentId} onChange={(event) => setIncidentId(event.target.value)} placeholder="Optional" />
          </label>
          <label>
            Investigator statement
            <textarea value={statement} onChange={(event) => setStatement(event.target.value)} />
          </label>
          <button className="primary" onClick={runPrediction}>
            <Search size={16} /> Predict similar cases
          </button>
          <span>{status}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <h3>Extracted Signals</h3>
          <ShieldCheck size={20} />
        </div>
        <div className="chip-list">
          {(result?.extractedEntities || []).map((entity) => (
            <span key={`${entity.type}-${entity.value}`} className="chip">
              {entity.type}: {entity.value}
            </span>
          ))}
        </div>
      </section>

      <section className="panel wide">
        <div className="panel-heading">
          <h3>Candidate Matches</h3>
          <AlertTriangle size={20} />
        </div>
        <div className="candidate-list">
          {(result?.candidates || []).map((candidate) => (
            <article key={candidate.incidentId} className="candidate-card">
              <div className="candidate-score">{candidate.score}</div>
              <div className="candidate-body">
                <strong>{candidate.title}</strong>
                <span>{candidate.incidentNumber || candidate.category || "Case candidate"} - {candidate.district || "Unknown district"}</span>
                <ul>
                  {candidate.signals.map((signal) => (
                    <li key={`${candidate.incidentId}-${signal.type}-${signal.label}`}>{signal.label}</li>
                  ))}
                </ul>
                <div className="action-row">
                  {candidate.proposedActions.map((action) => (
                    <button key={`${candidate.incidentId}-${action.actionType}`} onClick={() => applyAction(action)}>
                      <CheckCircle2 size={15} /> Apply {action.actionType.replaceAll("_", " ").toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
