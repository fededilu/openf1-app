const { useEffect, useRef, useState } = React;
const OPENF1_API_BASE_URL = "https://api.openf1.org/v1";

function openF1Url(endpoint, params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
            searchParams.set(key, value);
        }
    });

    const queryString = searchParams.toString();
    return `${OPENF1_API_BASE_URL}/${endpoint}${queryString ? `?${queryString}` : ""}`;
}

function App() {
    const [drivers, setDrivers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(() => getPageFromHash());

    useEffect(() => {
        async function loadDrivers() {
            try {
                const response = await fetch(openF1Url("drivers", { session_key: "latest" }));
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
                        className={currentPage === "live" ? "nav-link active" : "nav-link"}
                        onClick={() => navigateTo("live")}
                    >
                        Live
                    </button>
                    <button
                        type="button"
                        className={currentPage === "replay" ? "nav-link active" : "nav-link"}
                        onClick={() => navigateTo("replay")}
                    >
                        Replay
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
            ) : currentPage === "live" ? (
                <LivePage />
            ) : currentPage === "replay" ? (
                <ReplayPage />
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
                    Lista dei piloti.
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
                const response = await fetch(openF1Url("meetings", { year: currentYear }));
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
                const sessionResponse = await fetch(openF1Url("sessions", {
                    circuit_key: selectedRace.circuit_key,
                    year: selectedRace.year,
                    session_name: selectedSessionName
                }));
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
                    fetch(openF1Url("session_result", { session_key: session.session_key })),
                    fetch(openF1Url("drivers", { session_key: session.session_key }))
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

    async function handleGoLive(race) {
        try {
            const sessionResponse = await fetch(openF1Url("sessions", {
                circuit_key: race.circuit_key,
                year: race.year,
                session_name: "Race"
            }));
            if (!sessionResponse.ok) {
                throw new Error("Risposta non valida dal backend");
            }

            const sessions = await sessionResponse.json();
            const session = sessions[0];
            if (!session?.session_key) {
                throw new Error("Sessione non trovata");
            }

            const params = new URLSearchParams({
                session_key: session.session_key,
                title: race.circuit_short_name,
                meeting: race.meeting_name
            });
            window.location.hash = `live?${params.toString()}`;
        } catch (exception) {
            setError("Non riesco ad aprire la pagina live per questa gara.");
        }
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

    const nextRace = races
        .filter((race) => new Date(race.date_start) >= new Date())
        .sort((first, second) => new Date(first.date_start) - new Date(second.date_start))[0];

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
                <>
                    {nextRace && (
                        <article className="next-race-card" >
                            <img
                                src={nextRace.country_flag}
                                alt={`Flag ${nextRace.country_name}`}
                                className="race-flag"
                            />
                            <div className="race-info">
                                <div className="race-topline">
                                    <span className="race-date">NEXT RACE </span>
                                    <span className="race-date">{formatRaceDate(nextRace.date_start)}</span>
                                    <span className="team">{nextRace.country_name}</span>
                                </div>
                                <h2>{nextRace.circuit_short_name}</h2>
                                <p>{nextRace.meeting_name}</p>
                                <p>{nextRace.meeting_official_name}</p>
                                <button type="button" onClick={() => handleGoLive(nextRace)}>
                                    Go live
                                </button>
                            </div>
                        </article>
                    )}

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
                </>
            )}
        </section>
    );
}

function LivePage() {
    const liveParams = getLiveParams();
    const sessionKey = liveParams.get("session_key") || "latest";
    const title = liveParams.get("title") || "Live";
    const meeting = liveParams.get("meeting") || "Sessione in tempo reale";
    const replayFrom = liveParams.get("replay_from");
    const replayStepSeconds = Number(liveParams.get("replay_step_seconds") || 5) || 5;
    const isReplay = Boolean(replayFrom);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [standings, setStandings] = useState([]);
    const [lastUpdated, setLastUpdated] = useState("");
    const standingsRef = useRef([]);
    const lastRequestDate = useRef("");
    const replayCursorDate = useRef("");
    const inFlight = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const controller = new AbortController();

        async function loadLiveData() {
            const initialDate = isReplay ? new Date(replayFrom).toISOString() : new Date().toISOString();
            const initialWindowEnd = isReplay ? addSeconds(initialDate, replayStepSeconds) : null;
            lastRequestDate.current = initialDate;
            replayCursorDate.current = initialWindowEnd || "";
            setLoading(true);
            setError("");

            try {
                const intervalsUrl = buildIntervalsUrl(sessionKey, initialDate, initialWindowEnd);
                const [driversResponse, intervalsResponse] = await Promise.all([
                    fetch(openF1Url("drivers", { session_key: sessionKey }), {
                        signal: controller.signal
                    }),
                    fetch(intervalsUrl, {
                        signal: controller.signal
                    })
                ]);

                if (!driversResponse.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const driversData = await driversResponse.json();
                const intervalsData = await readIntervalsResponse(intervalsResponse);
                if (cancelled) {
                    return;
                }

                const initialStandings = driversData.map((driver, index) => ({
                    driver_number: driver.driver_number,
                    session_key: sessionKey,
                    driver,
                    gap_to_leader: null,
                    interval: null,
                    date: null,
                    sortIndex: index
                }));

                const mergedStandings = mergeIntervalsIntoStandings(initialStandings, intervalsData);
                standingsRef.current = mergedStandings;
                setStandings(mergedStandings);
                setLastUpdated(initialWindowEnd || new Date().toISOString());
            } catch (exception) {
                if (!cancelled && exception.name !== "AbortError") {
                    setError("Non riesco a caricare i dati live.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        async function pollLiveData() {
            if (inFlight.current || !lastRequestDate.current || (isReplay && !replayCursorDate.current)) {
                return;
            }

            inFlight.current = true;
            const dateGte = isReplay ? replayCursorDate.current : lastRequestDate.current;
            const dateLte = isReplay ? addSeconds(dateGte, replayStepSeconds) : new Date().toISOString();

            try {
                const intervalsResponse = await fetch(
                    buildIntervalsUrl(sessionKey, dateGte, dateLte),
                    { signal: controller.signal }
                );

                const intervalsData = await readIntervalsResponse(intervalsResponse);
                if (cancelled) {
                    return;
                }

                const mergedStandings = mergeIntervalsIntoStandings(standingsRef.current, intervalsData);
                standingsRef.current = mergedStandings;
                lastRequestDate.current = dateLte;
                replayCursorDate.current = dateLte;
                setStandings(mergedStandings);
                setLastUpdated(dateLte);
                setError("");
            } catch (exception) {
                if (!cancelled && exception.name !== "AbortError") {
                    setError("Aggiornamento live non riuscito. Riprovo al prossimo polling.");
                }
            } finally {
                inFlight.current = false;
            }
        }

        loadLiveData();
        const intervalId = window.setInterval(pollLiveData, 5000);

        return () => {
            cancelled = true;
            controller.abort();
            window.clearInterval(intervalId);
        };
    }, [sessionKey, isReplay, replayFrom, replayStepSeconds]);

    return (
        <section className="page">
            <header className="header">
                <p className="eyebrow">{isReplay ? "OpenF1 Replay" : "OpenF1 Live"}</p>
                <h1>{title}</h1>
                <p className="subtitle">
                    {meeting} &middot; polling ogni 5 secondi
                    {lastUpdated ? ` ${isReplay ? "tempo replay" : "ultimo aggiornamento"} ${formatLiveTime(lastUpdated)}` : ""}
                </p>
            </header>

            {loading && <p className="state">Caricamento live in corso...</p>}
            {error && <p className="state error">{error}</p>}

            {!loading && (
                <ul className="championship-list">
                    {standings.map((standing, index) => {
                        const driver = standing.driver;
                        const teamColour = driver?.team_colour ? `#${driver.team_colour}` : "#dbe1e8";

                        return (
                            <li
                                className="championship-card"
                                key={`${standing.session_key}-${standing.driver_number}`}
                            >
                                <span className="championship-position">
                                    {index + 1}
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
                                    <p>{standing.date ? `Dato ${formatLiveTime(standing.date)}` : "In attesa del primo intervallo"}</p>
                                </div>
                                <div className="championship-points">
                                    <strong>{formatGapToLeader(standing.gap_to_leader)}</strong>
                                    <span>dal leader</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function ReplayPage() {
    function startReplay() {
        const params = new URLSearchParams({
            session_key: "9939",
            title: "Belgian GP Replay",
            meeting: "Sessione storica OpenF1",
            replay_from: "2025-07-27T14:20:38.000Z",
            replay_step_seconds: "5"
        });
        window.location.hash = `live?${params.toString()}`;
    }

    return (
        <section className="page">
            <header className="header">
                <p className="eyebrow">OpenF1 Replay</p>
                <h1>Replay</h1>
                <p className="subtitle">
                    Simula una gara storica usando gli stessi aggiornamenti incrementali della pagina Live.
                </p>
            </header>

            <article className="next-race-card">
                <div className="race-info">
                    <div className="race-topline">
                        <span className="race-date">SESSION 9939</span>
                        <span className="team">27/07/2025 14:20:38 UTC</span>
                    </div>
                    <h2>Belgian GP Replay</h2>
                    <p>Ogni polling legge una finestra storica di 5 secondi e aggiorna solo i piloti ricevuti.</p>
                    <button type="button" onClick={startReplay}>
                        Avvia replay
                    </button>
                </div>
            </article>
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
                const championshipResponse = await fetch(openF1Url("championship_drivers", { session_key: "latest" }));
                if (!championshipResponse.ok) {
                    throw new Error("Risposta non valida dal backend");
                }

                const championshipData = await championshipResponse.json();
                const sessionKey = championshipData[0]?.session_key || "latest";
                const driversResponse = await fetch(openF1Url("drivers", { session_key: sessionKey }));
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

function mergeIntervalsIntoStandings(currentStandings, intervals) {
    const latestIntervalsByDriver = new Map();
    intervals
        .slice()
        .sort((first, second) => new Date(first.date) - new Date(second.date))
        .forEach((interval) => {
            latestIntervalsByDriver.set(String(interval.driver_number), interval);
        });

    return currentStandings
        .map((standing) => {
            const interval = latestIntervalsByDriver.get(String(standing.driver_number));
            if (!interval) {
                return standing;
            }

            return {
                ...standing,
                session_key: interval.session_key,
                gap_to_leader: interval.gap_to_leader,
                interval: interval.interval,
                date: interval.date
            };
        })
        .sort(compareLiveStandings);
}

async function readIntervalsResponse(response) {
    if (response.status === 404) {
        return [];
    }
    if (!response.ok) {
        throw new Error("Risposta non valida dal backend");
    }

    return response.json();
}

function buildIntervalsUrl(sessionKey, dateGte, dateLte) {
    const params = new URLSearchParams({
        session_key: sessionKey,
        "date>=": dateGte
    });

    if (dateLte) {
        params.set("date<=", dateLte);
    }

    return `${OPENF1_API_BASE_URL}/intervals?${params.toString()}`;
}

function addSeconds(dateValue, seconds) {
    return new Date(new Date(dateValue).getTime() + seconds * 1000).toISOString();
}

function compareLiveStandings(first, second) {
    const firstGap = getLiveGapValue(first.gap_to_leader);
    const secondGap = getLiveGapValue(second.gap_to_leader);

    if (firstGap !== secondGap) {
        return firstGap - secondGap;
    }

    return first.sortIndex - second.sortIndex;
}

function getLiveGapValue(gapToLeader) {
    if (gapToLeader === null || gapToLeader === undefined) {
        return Number.MAX_SAFE_INTEGER;
    }
    if (String(gapToLeader).toUpperCase().includes("LAP")) {
        return Number.MAX_SAFE_INTEGER - 1;
    }

    const numericGap = Number(gapToLeader);
    return Number.isNaN(numericGap) ? Number.MAX_SAFE_INTEGER : numericGap;
}

function formatLiveTime(dateValue) {
    return new Date(dateValue).toLocaleTimeString("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
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
    if (window.location.hash === "#live" || window.location.hash.startsWith("#live?")) {
        return "live";
    }
    if (window.location.hash === "#replay") {
        return "replay";
    }
    return "home";
}

function getLiveParams() {
    const hash = window.location.hash;
    const queryStart = hash.indexOf("?");
    return new URLSearchParams(queryStart >= 0 ? hash.slice(queryStart + 1) : "");
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
