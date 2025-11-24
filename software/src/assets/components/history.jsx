import { useEffect, useState } from "react";
import "../components/scrollbar.css";

function HistoryTable() {
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    fetch("https://projeto-integrador-nk5o.onrender.com/dados/historico")
      .then((res) => res.json())
      .then((data) => setHistorico(data))
      .catch((err) => console.error("Erro ao buscar histórico:", err));
  }, []);

  return (
    <div className="flex justify-center items-start px-6 bg-transparent">
      <div className="bg-purple-800/80 backdrop-blur-md p-6 rounded-2xl shadow-lg w-full max-w-[1000px] max-h-[80vh] overflow-y-auto border border-purple-700 history-scrollbar">
        {historico.length === 0 ? (
          <p className="text-slate-300 text-center">No data recorded yet.</p>
        ) : (
          <table className="w-full text-slate-200 border-collapse">
            <thead className="sticky top-0 bg-purple-900/90 backdrop-blur-md z-10">
              <tr className="border-b border-slate-600">
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Temperature (°C)</th>
                <th className="p-3 text-left">Humidity (%)</th>
                <th className="p-3 text-left">Pressure (Pa)</th>
                <th className="p-3 text-left">UV Index</th>
                <th className="p-3 text-left">Cloud Cover (%)</th>
                <th className="p-3 text-left">Raind Probability (%)</th>
                <th className="p-3 text-left">Precipitation (mm)</th>
                <th className="p-3 text-left">Date</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((row) => (
                <tr
                  key={row.id}
                  className="hover:bg-purple-700/60 transition-colors"
                >
                  <td className="p-3">{row.id}</td>
                  <td className="p-3">{row.temperatura ?? "-"}</td>
                  <td className="p-3">{row.umidade ?? "-"}</td>
                  <td className="p-3">{row.pressaoAtm ?? "-"}</td>
                  <td className="p-3">{row.uvClassificacao ?? "-"}</td>
                  <td className="p-3">{row.cloudCover ?? "-"}</td>
                  <td className="p-3">
                    {(row.rainProbability * 100).toFixed(2) ?? "-"}
                  </td>
                  <td className="p-3">{row.precipitacao ?? "-"}</td>
                  <td className="p-3">
                    {row.created_at
                      ? new Date(row.created_at).toLocaleString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default HistoryTable;
