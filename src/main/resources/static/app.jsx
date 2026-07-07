const { useEffect, useState } = React;

function App() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(() => getPageFromHash());

    useEffect(() => {
        async function loadDrivers() {
            try {
                const response = await fetch("/api/drivers?session_key=latest");
                if (!response.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const data = await response.json();
                setDrivers(data);
            } catch (exception) {
                setError("Non riesco a caricare i dati dei piloti.");
            } finally {
                setLoading(false);
            }
        }

        loadDrivers();
    }, []);

    useEffect(() => {
        function handleHashChange() {
            setCurrentPage(getPageFromHash());
            setMenuOpen(false);
        }

        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, []);

    function navigateTo(page) {
        window.location.hash = page === "results" ? "results" : "";
        setCurrentPage(page);
        setMenuOpen(false);
    }

    function handleShowDetails(driver) {
        console.log("Showing details for pilot: ", driver);
    }

    return (
        <>
            <nav className="topbar" aria-label="Navigazione principale">
                <button
                    className="menu-toggle"
                    type="button"
                    aria-label={menuOpen ? "Chiudi menu" : "Apri menu"}
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((isOpen) => !isOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                <div className={`nav-menu ${menuOpen ? "is-open" : ""}`}>
                    <button
                        type="button"
                        className={currentPage === "results" ? "nav-link active" : "nav-link"}
                        onClick={() => navigateTo("results")}
                    >
                        Results
                    </button>
                    <button
                        type="button"
                        className={currentPage === "home" ? "nav-link active" : "nav-link"}
                        onClick={() => navigateTo("home")}
                    >
                        Home
                    </button>
                </div>
            </nav>

            {currentPage === "home" ? (
                <HomePage
                    drivers={drivers}
                    loading={loading}
                    error={error}
                    onShowDetails={handleShowDetails}
                />
            ) : (
                <ResultsPage />
            )}
        </>
    );
}

function HomePage({ drivers, loading, error, onShowDetails }) {
    return (
        <section className="page">
            <header className="header">
                <p className="eyebrow">OpenF1 API</p>
                <h1>Lista piloti</h1>
                <p className="subtitle">
                    Dati caricati dal backend Java e mostrati con React.
                </p>
            </header>

            {loading && <p className="state">Caricamento in corso...</p>}
            {error && <p className="state error">{error}</p>}

            {!loading && !error && (
                <ul className="driver-list">
                    {drivers.map((driver) => (
                        <li className="driver-card" key={`${driver.session_key}-${driver.driver_number}`}>
                            <img
                                src={driver.headshot_url}
                                alt={`Foto di ${driver.full_name}`}
                                className="driver-photo"
                            />
                            <div className="driver-info">
                                <div className="driver-topline">
                                    <span className="driver-number">#{driver.driver_number}</span>
                                    <span className="team" style={{ borderColor: `#${driver.team_colour}` }}>
                                        {driver.team_name}
                                    </span>
                                </div>
                                <h2>{driver.full_name}</h2>
                                <p>{driver.country_code} &middot; {driver.name_acronym} &middot; {driver.broadcast_name}</p>
                                <button onClick={() => onShowDetails(driver)}>
                                    Details
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function ResultsPage() {
    const [races, setRaces] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        async function loadRaces() {
            try {
                const response = await fetch(`/api/sessions?year=${currentYear}&session_name=Race`);
                if (!response.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const data = await response.json();
                setRaces(data);
            } catch (exception) {
                setError("Non riesco a caricare la lista delle gare.");
            } finally {
                setLoading(false);
            }
        }

        loadRaces();
    }, [currentYear]);

    return (
        <section className="page">
            <header className="header">
                <p className="eyebrow">OpenF1 API</p>
                <h1>Results</h1>
                <p className="subtitle">
                    Gare della stagione {currentYear}.
                </p>
            </header>

            {loading && <p className="state">Caricamento gare in corso...</p>}
            {error && <p className="state error">{error}</p>}

            {!loading && !error && (
                <ul className="race-list">
                    {races.map((race) => (
                        <li className="race-card" key={race.session_key}>
                            <img
                                src={getFlagUrl(race.country_code)}
                                alt={`Bandiera ${race.country_name}`}
                                className="race-flag"
                            />
                            <div className="race-info">
                                <div className="race-topline">
                                    <span className="race-date">{formatRaceDate(race.date_start)}</span>
                                    <span className="team">{race.country_name}</span>
                                </div>
                                <h2>{race.circuit_short_name}</h2>
                                <p>{race.country_name}</p>
                                <button type="button" onClick={() => {}}>
                                    Vedi risultati
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function championShipPage(){
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const currentYear = new Date().getFullYear();
    const [drivers, setDrivers] = useState([]);

    useEffect(() => {
            async function loadChampionship() {
                try {
                    const response = await fetch(`/api/championship_drivers?session_key=${currentYear}`);
                    if (!response.ok) {
                        throw new Error("Risposta non valida dal backend");
                    }

                    const data = await response.json();
                    setDrivers(data);
                } catch (exception) {
                    setError("Non riesco a caricare la lista delle gare.");
                } finally {
                    setLoading(false);
                }
            }

            loadChampionship();
        }, [currentYear]);

    return (
        <section className="page">
            <header className="header">
                <p className="eyebrow">OpenF1 API</p>
                <h1>Results</h1>
                <p className="subtitle">
                    Classifica campionato mondiale {currentYear}.
                </p>
            </header>

            {loading && <p className="state">Caricamento gare in corso...</p>}
            {error && <p className="state error">{error}</p>}

            {!loading && !error && (
                <ul className="driver-list">
                    {drivers.map((driver) => (
                        <li className="driver-card" key={`${driver.session_key}-${driver.driver_number}`}>
                            <img
                                src={driver.headshot_url}
                                alt={`Foto di ${driver.full_name}`}
                                className="driver-photo"
                            />
                            <div className="driver-info">
                                <div className="driver-topline">
                                    <span className="driver-number">#{driver.driver_number}</span>
                                    <span className="team" style={{ borderColor: `#${driver.team_colour}` }}>
                                        {driver.team_name}
                                    </span>
                                </div>
                                <h2>{driver.full_name}</h2>
                                <p>{driver.country_code} &middot; {driver.name_acronym} &middot; {driver.broadcast_name}</p>
                                <button onClick={() => onShowDetails(driver)}>
                                    Details
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
        );

}

function formatRaceDate(dateStart) {
    const date = new Date(dateStart);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function getFlagUrl(countryCode) {
    return `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
}

function getPageFromHash() {
    return window.location.hash === "#results" ? "results" : "home";
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
