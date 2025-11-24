import { useEffect, useState } from "react";
import { getCloudCover } from "../../services/cloudService";

const API_URL = "https://projeto-integrador-nk5o.onrender.com";

function Visibility() {
  const [cloud, setCloud] = useState({ value: 0, time: null });

  async function fetchCloud() {
    try {
      const data = await getCloudCover();
      setCloud(data);

      console.log("Enviando cloudCover:", data.value);

      const response = await fetch(`${API_URL}/cloudcover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cloudCover: data.value }),
      });

      if (!response.ok) throw new Error("Falha ao enviar cloudCover");
    } catch (err) {
      console.error("Erro ao buscar cloud cover ou enviar para predição:", err);
    }
  }

  useEffect(() => {
    fetchCloud();
    const now = new Date();
    const msAteProximaHora =
      (60 - now.getMinutes()) * 60 * 1000 -
      now.getSeconds() * 1000 -
      now.getMilliseconds();

    const timeout = setTimeout(() => {
      fetchCloud();
      const interval = setInterval(fetchCloud, 3600000);
      return () => clearInterval(interval);
    }, msAteProximaHora);

    return () => clearTimeout(timeout);
  }, []);

  let data = new Date();
  const level = Math.max(0, Math.min(100, -(cloud.value - 100)));

  return (
    <div className="bg-purple-800 rounded-3xl p-4 sm:p-6 md:p-8 mt-6 shadow  w-full max-h-5xl mx-auto space-y-4">
      <div className="flex justify-between text-white mb-2">
        <span className="font-bold">Today</span>
        <span>{data.toString().slice(0, 11)}</span>
      </div>
      <div className="w-100 bg-purple-900 h-6 rounded-full text-slate-200 font-bold ">
        <div
          className="h-6 bg-gradient-to-r from-red-500 via-yellow-400 to-green-500 rounded-full text-right px-2 font-bold text-sm text-slate-200"
          style={{ width: `${level}%` }}
        ></div>
        <div
          className="text-sm font-bold text-slate-200 mx-auto py-1"
          style={{ transform: `translateX(${level - 2}%)` }}
        >
          {level}%
        </div>
      </div>
      <div className="flex justify-between text-slate-300 w-100 text-sm mt-1 py-3">
        <span>Poor</span>
        <span>Moderate</span>
        <span>Excellent</span>
      </div>
      <div className="flex justify-between text-white mb-2">
        <small className="text-sm text-slate-400">
          Updated: {new Date(cloud.time).toLocaleTimeString()}
        </small>
        <small className="text-sm font-bold text-slate-200">
          {cloud.value}% cloud cover
        </small>
      </div>
    </div>
  );
}

export default Visibility;
