import { useEffect, useState, useCallback } from "react";
import "../components/scrollbar.css";

function HistoryTable() {
  const [historico, setHistorico] = useState([]);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);

    try {
      const res = await fetch(
        `https://projeto-integrador-nk5o.onrender.com/dados/historico?limit=${limit}&offset=${offset}`
      );
      const data = await res.json();

      setHistorico((prev) => [...prev, ...data]);

      if (data.length < limit) {
        setHasMore(false);
      } else {
        setOffset((prev) => prev + limit);
      }
    } catch (err) {
      console.error("Erro ao buscar histórico:", err);
    } finally {
      setLoading(false);
    }
  }, [offset, limit, loading, hasMore]);

  useEffect(() => {
    fetch("https://projeto-integrador-nk5o.onrender.com/dados/historico")
      .then((res) => res.json())
      .then((data) => setHistorico(data))
      .catch((err) => console.error("Erro ao buscar histórico:", err));

    // chamada direta, sem usar loadMore
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://projeto-integrador-nk5o.onrender.com/dados/historico?limit=${limit}&offset=0`
        );
        const data = await res.json();
        setHistorico(data);

        if (data.length < limit) {
          setHasMore(false);
        } else {
          setOffset(limit); // primeira página carregada
        }
      } catch (err) {
        console.error("Erro ao carregar inicial:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <div className="flex justify-center items-start px-6 bg-transparent">
        <div className="bg-purple-800/80 backdrop-blur-md p-6 rounded-2xl shadow-lg w-full max-w-[1000px] max-h-[80vh] overflow-y-auto border border-purple-700 history-scrollbar">
          {historico.length === 0 ? (
            <p className="text-slate-300 text-center">No data recorded yet.</p>
          ) : (
            <table className="w-full text-slate-200">
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
      <div className="flex justify-center relative mt-4">
        {hasMore && (
          <div className="justify-end flex gap-3 mt-9">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-3 py-1 absolute right-0 top-0 bottom-0 text-sm text-slate-200 bg-purple-600 hover:bg-purple-700 rounded-lg"
            >
              {loading ? "Carregando..." : "Carregar mais"}
            </button>
          </div>
        )}

        {!hasMore && historico.length > 0 && (
          <p className="text-center text-slate-300 mt-4">
            Todos os dados foram carregados.
          </p>
        )}
      </div>
    </div>
  );
}

export default HistoryTable;
