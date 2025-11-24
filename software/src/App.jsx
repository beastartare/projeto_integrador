import { useEffect, useState } from "react";
import { InfoIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./index.css";
import Events from "./assets/components/events";
import StarsBackground from "./assets/components/stars";
import Visibility from "./assets/components/visibily";
import Info from "./assets/components/info";

function App() {
  // Armazena eventos localmente
  const [events, setEvents] = useState(
    JSON.parse(localStorage.getItem("events")) || []
  );

  const [loadingEvents, setLoadingEvents] = useState(false);
  const [eventsError, setEventsError] = useState(null);
  const [locationGranted, setLocationGranted] = useState(false);

  // Atualiza localStorage sempre que os eventos mudam
  useEffect(() => {
    localStorage.setItem("events", JSON.stringify(events));
  }, [events]);

  // Verifica se a localização foi concedida
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => setLocationGranted(true),
        () => setLocationGranted(true)
      );
    } else {
      setLocationGranted(true);
    }
  }, []);

  // Busca eventos (RSS XML)
  useEffect(() => {
    const fetchEvents = async () => {
      if (!locationGranted) return;

      setLoadingEvents(true);
      setEventsError(null);
      try {
        console.log("Fetching events...");
        const response = await fetch(
          "https://projeto-integrador-nk5o.onrender.com/events"
        );

        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);

        // Lê como texto XML (não JSON)
        const xmlText = await response.text();

        // ✅ Opcional: converte XML para JSON
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlText, "text/xml");
        const items = Array.from(xml.querySelectorAll("item")).map((item) => ({
          title: item.querySelector("title")?.textContent || "",
          description: item.querySelector("description")?.textContent || "",
          link: item.querySelector("link")?.textContent || "",
          pubDate: item.querySelector("pubDate")?.textContent || "",
        }));
        console.log("Parsed events:", items.length);
        setEvents(items);

        console.log("Parsed events:", items.length);
        setEvents(items);
      } catch (err) {
        console.error("Erro ao buscar feed:", err);
        setEventsError(err.message || "Erro ao buscar eventos");
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, [locationGranted]);

  const navigate = useNavigate();

  const ViewAbout = () => navigate(`/about`);

  return (
    <div className="w-full min-h-screen flex justify-center gap-4 p-4 relative overflow-x-hidden">
      <StarsBackground />
      <div>
        <button
          onClick={ViewAbout}
          className="absolute top-3 right-2 sm:top-5 sm:right-3 md:top-10 md:right-6 p-2 sm:p-2 md:p-3 z-50 mt-3 text-sm rounded-3xl bg-purple-600 hover:bg-purple-700"
        >
          <InfoIcon />
        </button>
      </div>

      <div className="inset-0 sm:p-6 md:p-8 p-4 relative z-10 flex flex-col items-center space-y-6 w-full max-w-5xl">
        <h1 className="text-xl sm:text-2xl md:text-3xl text-slate-200 font-bold text-center">
          Next Astronomical Events
        </h1>

        {loadingEvents ? (
          <div className="text-slate-300 text-center font-bold">
            Loading Events...
          </div>
        ) : eventsError ? (
          <div className="text-red-400">Erro: {eventsError}</div>
        ) : (
          <Events events={events} />
        )}

        <h1 className="sm:text-2xl md:text-3xl text-xl text-slate-200 font-bold text-center">
          Sky Visibility
        </h1>
        <Visibility />
        <Info />
      </div>
    </div>
  );
}

export default App;
