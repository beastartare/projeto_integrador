import PropTypes from "prop-types";
import { useEffect, useState } from "react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(label));

    const key = payload[0].name;
    const value = payload[0].value;

    const labelName = key === "temperatura" ? "Temperature" : "Humidity";

    const unit = key === "temperatura" ? "°C" : "%";

    return (
      <div
        style={{
          backgroundColor: "#4B0082",
          color: "#ffffff",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "14px",
        }}
      >
        <p>{`Date: ${formattedDate}`}</p>
        <p>{`${labelName}: ${value}${unit}`}</p>
      </div>
    );
  }
  return null;
};

CustomTooltip.propTypes = {
  active: PropTypes.bool,
  payload: PropTypes.array,
  label: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.instanceOf(Date),
  ]),
};

function Graphs() {
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    fetch("https://projeto-integrador-nk5o.onrender.com/dados/historico")
      .then((res) => res.json())
      .then((data) => {
        const formattedData = data
          .map((item) => ({
            ...item,
            created_at: new Date(item.created_at),
          }))
          .sort((a, b) => a.created_at - b.created_at);

        setHistorico(formattedData);
      })
      .catch((err) => console.error("Erro ao buscar histórico:", err));
  }, []);

  return (
    <>
      {historico.length === 0 ? (
        <p className="text-slate-300 text-center">No data recorded yet.</p>
      ) : (
        <div className="flex flex-col w-full space-y-6 p-4 sm:p-6 md:p-8">
          {/* TEMPERATURA */}
          <div className="bg-purple-800 rounded-md shadow h-[475px] w-full">
            <h2 className="text-slate-200 text-center text-lg font-bold mb-2">
              Temperature (°C)
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={historico}
                margin={{ top: 2, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="created_at"
                  stroke="#ccc"
                  tickFormatter={(value) =>
                    new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(value))
                  }
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={[0, "auto"]}
                  label={{
                    value: "°C",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#ccc",
                  }}
                  stroke="#ccc"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="temperatura"
                  stroke="#f2ff00"
                  strokeWidth={3}
                  dot={{ fill: "#f2ff00" }}
                  isAnimationActive={true}
                  activeDot={{ r: 8, fill: "#f2ff00", stroke: "f2ff00" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* UMIDADE */}
          <div className="bg-purple-800 p-6 rounded-md shadow h-[475px] w-full">
            <h2 className="text-slate-200 text-center text-lg font-bold mb-2">
              Humidity (%)
            </h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={historico}
                margin={{ top: 2, right: 10, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="created_at"
                  stroke="#ccc"
                  tickFormatter={(value) =>
                    new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(new Date(value))
                  }
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis
                  domain={[0, 100]}
                  label={{
                    value: "%",
                    angle: -90,
                    position: "insideLeft",
                    fill: "#ccc",
                  }}
                  stroke="#ccc"
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="umidade"
                  stroke="#00b8cb"
                  strokeWidth={3}
                  dot={{ fill: "#00b8cb" }}
                  isAnimationActive={true}
                  activeDot={{ r: 8, fill: "#00b8cb", stroke: "00b8cb" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );
}

export default Graphs;
