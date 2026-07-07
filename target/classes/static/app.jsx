const { useEffect, useRef, useState } = React;

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
        window.location.hash = page === "home" ? "" : page;
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
                        className={currentPage === "driver-championship" ? "nav-link active" : "nav-link"}
                        onClick={() => navigateTo("driver-championship")}
                    >
                        Driver Championship
                    </button>
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
            ) : currentPage === "driver-championship" ? (
                <DriverChampionshipPage />
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
    const [selectedRace, setSelectedRace] = useState(null);
    const [selectedSessionName, setSelectedSessionName] = useState("Race");
    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(false);
    const [resultsError, setResultsError] = useState("");
    const previousScrollY = useRef(0);
    const shouldRestoreScroll = useRef(false);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        async function loadRaces() {
            try {
                const response = await fetch(`/api/meetings?year=${currentYear}`);
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

    useEffect(() => {
        if (!selectedRace || !isRaceFinished(selectedRace)) {
            return;
        }

        async function loadResults() {
            setResultsLoading(true);
            setResultsError("");
            setResults([]);

            try {
                const sessionResponse = await fetch(
                    `/api/sessions?circuit_key=${encodeURIComponent(selectedRace.circuit_key)}&year=${encodeURIComponent(selectedRace.year)}&session_name=${encodeURIComponent(selectedSessionName)}`
                );
                if (!sessionResponse.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const sessions = await sessionResponse.json();
                const session = sessions[0];
                if (!session?.session_key) {
                    setResultsError("Sessione non trovata per questa gara.");
                    return;
                }

                const [resultsResponse, driversResponse] = await Promise.all([
                    fetch(`/api/session_result?session_key=${encodeURIComponent(session.session_key)}`),
                    fetch(`/api/drivers?session_key=${encodeURIComponent(session.session_key)}`)
                ]);

                if (!resultsResponse.ok || !driversResponse.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const resultsData = await resultsResponse.json();
                const driversData = await driversResponse.json();
                const driversByNumber = new Map(
                    driversData.map((driver) => [String(driver.driver_number), driver])
                );

                const enrichedResults = resultsData
                    .map((result) => ({
                        ...result,
                        driver: driversByNumber.get(String(result.driver_number))
                    }))
                    .sort((first, second) => getResultPositionValue(first) - getResultPositionValue(second));

                setResults(enrichedResults);
            } catch (exception) {
                setResultsError("Non riesco a caricare i risultati della sessione.");
            } finally {
                setResultsLoading(false);
            }
        }

        loadResults();
    }, [selectedRace, selectedSessionName]);

    useEffect(() => {
        if (!selectedRace && shouldRestoreScroll.current) {
            shouldRestoreScroll.current = false;
            requestAnimationFrame(() => {
                window.scrollTo({
                    top: previousScrollY.current,
                    behavior: "auto"
                });
            });
        }
    }, [selectedRace]);

    function handleShowResults(race) {
        previousScrollY.current = window.scrollY;
        setSelectedRace(race);
        setSelectedSessionName("Race");
        setResults([]);
        setResultsError("");
    }

    function handleBackToRaces() {
        shouldRestoreScroll.current = true;
        setSelectedRace(null);
        setSelectedSessionName("Race");
        setResults([]);
        setResultsError("");
    }

    if (selectedRace) {
        const raceFinished = isRaceFinished(selectedRace);
        return (
            <section className="page">
                <button
                    type="button"
                    className="back-button"
                    aria-label="Torna alla lista gare"
                    onClick={handleBackToRaces}
                >
                    &larr;
                </button>

                <header className="header">
                    <p className="eyebrow">Results</p>
                    <h1>{selectedRace.circuit_short_name}</h1>
                    <p className="subtitle">
                        {selectedRace.meeting_name} &middot; {formatRaceDate(selectedRace.date_start)}
                    </p>
                </header>

                {!raceFinished ? (
                    <article className="state race-pending">
                        <strong>La gara non e iniziata.</strong>
                        <span>I risultati saranno disponibili dopo la conclusione della sessione.</span>
                    </article>
                ) :
                    selectedRace.is_cancelled ? (
                        <article className="state race-cancelled">
                            <strong>La e stata cancellata.</strong>
                            <span>Risultati non disponibili</span>
                        </article>
                ) :
                (
                    <>
                        <div className="result-tabs" role="tablist" aria-label="Tipo sessione">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={selectedSessionName === "Qualifying"}
                                className={selectedSessionName === "Qualifying" ? "result-tab active" : "result-tab"}
                                onClick={() => setSelectedSessionName("Qualifying")}
                            >
                                Qualifiche
                            </button>
                            <button
                                type="button"
                                role="tab"
                                aria-selected={selectedSessionName === "Race"}
                                className={selectedSessionName === "Race" ? "result-tab active" : "result-tab"}
                                onClick={() => setSelectedSessionName("Race")}
                            >
                                Gara
                            </button>
                        </div>

                        {resultsLoading && <p className="state">Caricamento risultati in corso...</p>}
                        {resultsError && <p className="state error">{resultsError}</p>}

                        {!resultsLoading && !resultsError && (
                            <ul className="result-list">
                                {results.map((result) => {
                                    const driver = result.driver;
                                    const teamColour = driver?.team_colour ? `#${driver.team_colour}` : "#dbe1e8";

                                    return (
                                        <li
                                            className="result-card"
                                            key={`${result.session_key}-${result.driver_number}`}
                                        >
                                            <span className="championship-position">
                                                {result.position || "-"}
                                            </span>
                                            {driver?.headshot_url && (
                                                <img
                                                    src={driver.headshot_url}
                                                    alt={`Foto di ${driver.full_name}`}
                                                    className="driver-photo"
                                                />
                                            )}
                                            <div className="driver-info">
                                                <div className="driver-topline">
                                                    <span className="driver-number">#{result.driver_number}</span>
                                                    <span className="team" style={{ borderColor: teamColour }}>
                                                        {driver?.team_name || "Scuderia non disponibile"}
                                                    </span>
                                                </div>
                                                <h2>{driver?.full_name || `Pilota #${result.driver_number}`}</h2>
                                                <p>{formatResultStatus(result)}</p>
                                            </div>
                                            <div className="result-gap">
                                                <strong>{formatGapToLeader(result.gap_to_leader)}</strong>
                                                <span>dal primo</span>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </>
                )}
            </section>
        );
    }

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
                        <li className="race-card" key={race.meeting_key}>
                            <img
                                src={race.country_flag}
                                alt={`Flag ${race.country_name}`}
                                className="race-flag"
                            />
                            <div className="race-info">
                                <div className="race-topline">
                                    <span className="race-date">{formatRaceDate(race.date_start)}</span>
                                    <span className="team">{race.country_name}</span>
                                </div>
                                <h2>{race.circuit_short_name}</h2>
                                <p>{race.meeting_name}</p>
                                <p>{race.meeting_official_name}</p>
                                <button type="button" onClick={() => handleShowResults(race)}>
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

function DriverChampionshipPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [standings, setStandings] = useState([]);

    useEffect(() => {
        async function loadChampionship() {
            try {
                const championshipResponse = await fetch("/api/championship_drivers?session_key=latest");
                if (!championshipResponse.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const championshipData = await championshipResponse.json();
                const sessionKey = championshipData[0]?.session_key || "latest";
                const driversResponse = await fetch(`/api/drivers?session_key=${sessionKey}`);
                if (!driversResponse.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const driversData = await driversResponse.json();
                const driversByNumber = new Map(
                    driversData.map((driver) => [String(driver.driver_number), driver])
                );

                const enrichedStandings = championshipData
                    .map((standing) => ({
                        ...standing,
                        driver: driversByNumber.get(String(standing.driver_number))
                    }))
                    .sort((first, second) => first.position_current - second.position_current);

                setStandings(enrichedStandings);
            } catch (exception) {
                setError("Non riesco a caricare la classifica piloti.");
            } finally {
                setLoading(false);
            }
        }

        loadChampionship();
    }, []);

    return (
        <section className="page">
            <header className="header">
                <p className="eyebrow">OpenF1 API</p>
                <h1>Driver Championship</h1>
                <p className="subtitle">
                    Classifica piloti aggiornata con nome, scuderia e punti.
                </p>
            </header>

            {loading && <p className="state">Caricamento classifica in corso...</p>}
            {error && <p className="state error">{error}</p>}

            {!loading && !error && (
                <ul className="championship-list">
                    {standings.map((standing) => {
                        const driver = standing.driver;
                        const teamColour = driver?.team_colour ? `#${driver.team_colour}` : "#dbe1e8";

                        return (
                            <li
                                className="championship-card"
                                key={`${standing.session_key}-${standing.driver_number}`}
                            >
                                <span className="championship-position">
                                    {standing.position_current}
                                </span>
                                {driver?.headshot_url && (
                                    <img
                                        src={driver.headshot_url}
                                        alt={`Foto di ${driver.full_name}`}
                                        className="driver-photo"
                                    />
                                )}
                                <div className="driver-info">
                                    <div className="driver-topline">
                                        <span className="driver-number">#{standing.driver_number}</span>
                                        <span className="team" style={{ borderColor: teamColour }}>
                                            {driver?.team_name || "Scuderia non disponibile"}
                                        </span>
                                    </div>
                                    <h2>{driver?.full_name || `Pilota #${standing.driver_number}`}</h2>
                                </div>
                                <div className="championship-points">
                                    <strong>{standing.points_current}</strong>
                                    <span>punti</span>
                                </div>
                            </li>
                        );
                    })}
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

function isRaceFinished(race) {
    if (!race?.date_end) {
        return false;
    }

    const oneDayAfterNow = Date.now() + 24 * 60 * 60 * 1000;
    return oneDayAfterNow > new Date(race.date_end).getTime();
}


function formatGapToLeader(gapToLeader) {
    if(Array.isArray(gapToLeader)){
        gapToLeader = gapToLeader.at(-1);
    }
    if (gapToLeader === 0) {
        return "Leader";
    }
    if (gapToLeader === null || gapToLeader === undefined) {
        return "-";
    }
    if (gapToLeader.toString().includes("LAP")){
        return gapToLeader.toString();
    }

    return `+${Number(gapToLeader).toFixed(3)}s`;
}

function getResultPositionValue(result) {
    return result.position === null || result.position === undefined ? Number.MAX_SAFE_INTEGER : result.position;
}

function formatResultStatus(result) {
    if (result.dsq) {
        return "Squalificato";
    }
    if (result.dns) {
        return "Non partito";
    }
    if (result.dnf) {
        return "Ritirato";
    }
    if (result.number_of_laps) {
        return `${result.number_of_laps} giri`;
    }
    return "Risultato classificato";
}

function getFlagUrl(countryCode) {
    return `https://flagcdn.com/w160/${countryCode.toLowerCase()}.png`;
}

function getPageFromHash() {
    if (window.location.hash === "#results") {
        return "results";
    }
    if (window.location.hash === "#driver-championship") {
        return "driver-championship";
    }
    return "home";
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
