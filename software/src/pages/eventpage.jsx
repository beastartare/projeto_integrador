import { ChevronLeftIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StarsBackground from "../assets/components/stars.jsx";
import { useState, useEffect } from "react";

function EventPage() {
  const navigate = useNavigate();

  const mapa = {
    "&deg;": "°",
    "&#39;": "'",
    "&ndash": "-",
  };

  const regex = new RegExp(Object.keys(mapa).join("|"), "g");

  const [searchParams] = useSearchParams();
  const title = searchParams.get("title") || "";
  const description = searchParams.get("description") || "";
  const link = searchParams.get("link") || "";

  const [imageUrl, setImageUrl] = useState(null);
  const [iconalt, setIconAlt] = useState(null);
  const [credit, setCredit] = useState(null);
  const [loadingImage, setLoadingImage] = useState(true);
  const [loadingCredit, setLoadingCredit] = useState(true);
  const [errorImage, setErrorImage] = useState(null);
  const [errorCredit, setErrorCredit] = useState(null);

  useEffect(() => {
    if (link) {
      setLoadingImage(true);
      setErrorImage(null);

      const fetchImage = async () => {
        try {
          const response = await fetch(
            "https://python-server-gktf.onrender.com/get_first_image",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ link: link }),
            }
          );

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const data = await response.json();
          setImageUrl(data.image_url);
        } catch (error) {
          console.error("Erro ao buscar imagem:", error);
          setErrorImage(error.message);
        } finally {
          setLoadingImage(false);
        }
      };

      fetchImage();
    } else {
      setLoadingImage(false);
    }
  }, [link]);

  useEffect(() => {
    if (link) {
      const fetchIcon = async () => {
        try {
          const response = await fetch(
            "https://python-server-gktf.onrender.com/get_icon",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ link: link }),
            }
          );

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const data = await response.json();
          setIconAlt(data.icon_alt);
        } catch (error) {
          console.error("Erro ao buscar icone:", error);
        }
      };
      fetchIcon();
    }
  }, [link]);

  useEffect(() => {
    if (link) {
      setLoadingCredit(true);
      setErrorCredit(null);
      const fetchCredit = async () => {
        try {
          const response = await fetch(
            "https://python-server-gktf.onrender.com/get_credits",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ link: link }),
            }
          );

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const data = await response.json();
          setCredit(data.credit_text);
        } catch (error) {
          console.error("Erro ao buscar credito:", error);
          setErrorCredit(error.message);
        } finally {
          setLoadingCredit(false);
        }
      };

      fetchCredit();
    } else {
      setLoadingCredit(false);
    }
  }, [link]);

  const getProcessedTitle = () => {
    if (!title) return "Título não disponível";

    const parts = title.split(":");
    return parts.length > 1 ? parts[1].trim() : title;
  };

  const getProcessedDescription = () => {
    if (!description) return "Descrição não disponível";

    try {
      if (description.length >= 8) {
        return description
          .slice(3, -5)
          .replace(regex, (match) => mapa[match] || match);
      }
      return description.replace(regex, (match) => mapa[match] || match);
    } catch (error) {
      console.error("Erro ao processar descrição:", error);
      return description;
    }
  };

  return (
    <div className="w-screen h-screen relative ">
      <StarsBackground />
      <div className="inset-0 flex justify-around items-start relative">
        <div className="bg-purple-950 flex justify-center p-4 sm:p-6 md:p-8">
          <div className="space-y-4 w-[400px] sm:w-[600px] md:w-[800px]">
            <div className="flex justify-center relative">
              <button
                onClick={() => navigate(-1)}
                className="absolute left-0 top-0 bottom-0 text-slate-100"
              >
                <ChevronLeftIcon />
              </button>
              <h1 className="text-slate-200 text-center text-lg font-bold mb-2">
                Description
              </h1>
            </div>
            <div className="space-y-4 bg-purple-800 p-6 rounded-3xl border-purple-900 border-y-2 border-x-2shadow">
              <div className="flex gap-4">
                <div>
                  {loadingImage && (
                    <p className="text-white text-center">Loading Image...</p>
                  )}

                  {errorImage && (
                    <p className="text-red-400 text-center">
                      Error loading image: {errorImage}
                    </p>
                  )}

                  {imageUrl && (
                    <img
                      className="rounded-3xl h-auto w-50 object-cover"
                      src={imageUrl}
                      alt="Imagem do evento"
                      onError={(e) => {
                        console.error("Erro ao carregar imagem");
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                </div>
                <div className="text-left flex-1">
                  <h2 className="text-xl text-white font-bold">
                    {getProcessedTitle()}
                  </h2>
                  <p className="text-white whitespace-pre-wrap py-1 ">
                    {getProcessedDescription()}
                  </p>
                  {iconalt && (
                    <p className="text-white whitespace-pre-wrap py-4">
                      {iconalt.split("from")[0]}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-purple-950 justify-center p-4 rounded-3xl">
                <h1 className="text-slate-200 text-lg font-bold mb-2">
                  ⚠️ Safety Notice
                </h1>
                <p className="text-slate-300 whitespace-pre-wrap ">
                  Never look directly at the Sun without certified solar filters
                  (ISO 12312-2). Do not use sunglasses, glass, or improvised
                  methods. For nighttime observations, choose safe locations.
                </p>
              </div>
              <div>
                <h2 className="text-slate-200 text-lg font-bold mb-2">
                  Image credit
                </h2>
                {loadingCredit && (
                  <p className="text-white text-left">Loading Credit...</p>
                )}

                {errorCredit && (
                  <p className="text-red-400 text-center">
                    Error loading credit: {errorCredit}
                  </p>
                )}
                {credit && (
                  <p className="text-white whitespace-pre-wrap py-2">
                    {credit}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventPage;
