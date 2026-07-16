package it.example.openf1;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

public class OpenF1Application {
    private static final int PORT = 8080;
    private static final String OPENF1_DRIVERS_URL = "https://api.openf1.org/v1/drivers";
    private static final String OPENF1_MEETINGS_URL = "https://api.openf1.org/v1/meetings";
    private static final String OPENF1_DRIVERS_STANDING = "https://api.openf1.org/v1/championship_drivers";
    private static final String OPENF1_SESSIONS_URL = "https://api.openf1.org/v1/sessions";
    private static final String OPENF1_SESSION_RESULT_URL = "https://api.openf1.org/v1/session_result";
    private static final String OPENF1_INTERVALS_URL = "https://api.openf1.org/v1/intervals";
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/api/drivers", OpenF1Application::handleDrivers);
        server.createContext("/api/meetings", OpenF1Application::handleMeetings);
        server.createContext("/api/championship_drivers", OpenF1Application::handleChampionship);
        server.createContext("/api/sessions", OpenF1Application::handleSessions);
        server.createContext("/api/session_result", OpenF1Application::handleSessionResult);
        server.createContext("/api/intervals", OpenF1Application::handleIntervals);
        server.createContext("/", OpenF1Application::handleStaticFile);
        server.start();

        System.out.println("Server avviato: http://localhost:" + PORT);
        System.out.println("API locale: http://localhost:" + PORT + "/api/");
    }

    private static void handleDrivers(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Metodo non supportato");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String sessionKey = query.getOrDefault("session_key", "9158");
        String apiUrl = OPENF1_DRIVERS_URL
                + "?session_key=" + urlEncode(sessionKey);

        proxyOpenF1Request(exchange, apiUrl, "Errore nel recupero dati da OpenF1");
    }

    private static void handleChampionship(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Metodo non supportato");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String sessionKey = query.getOrDefault("session_key", "latest");
        String apiUrl = OPENF1_DRIVERS_STANDING
                + "?session_key=" + urlEncode(sessionKey);
        proxyOpenF1Request(exchange, apiUrl, "Errore nel recupero classifica piloti da OpenF1");
    }

    private static void handleMeetings(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Metodo non supportato");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String year = query.getOrDefault("year", "latest");
        String apiUrl = OPENF1_MEETINGS_URL
                + "?year=" + urlEncode(year);
        proxyOpenF1Request(exchange, apiUrl, "Errore nel recupero championship da OpenF1");
    }

    private static void handleSessions(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Metodo non supportato");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String circuitKey = query.get("circuit_key");
        String year = query.get("year");
        String sessionName = query.get("session_name");

        if (circuitKey == null || year == null || sessionName == null) {
            sendJsonError(exchange, 400, "Parametri circuit_key, year e session_name obbligatori");
            return;
        }

        String apiUrl = OPENF1_SESSIONS_URL
                + "?circuit_key=" + urlEncode(circuitKey)
                + "&year=" + urlEncode(year)
                + "&session_name=" + urlEncode(sessionName);
        proxyOpenF1Request(exchange, apiUrl, "Errore nel recupero sessioni da OpenF1");
    }

    private static void handleSessionResult(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Metodo non supportato");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String sessionKey = query.get("session_key");

        if (sessionKey == null) {
            sendJsonError(exchange, 400, "Parametro session_key obbligatorio");
            return;
        }

        String apiUrl = OPENF1_SESSION_RESULT_URL
                + "?session_key=" + urlEncode(sessionKey);

        proxyOpenF1Request(exchange, apiUrl, "Errore nel recupero risultati sessione da OpenF1");
    }

    private static void handleIntervals(HttpExchange exchange) throws IOException {
        addCorsHeaders(exchange);

        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            return;
        }

        if (!"GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            sendText(exchange, 405, "Metodo non supportato");
            return;
        }

        Map<String, String> query = parseQuery(exchange.getRequestURI().getRawQuery());
        String sessionKey = query.getOrDefault("session_key", "latest");
        String dateGte = query.get("date_gte");
        String dateLte = query.get("date_lte");

        if (dateGte == null) {
            sendJsonError(exchange, 400, "Parametro date_gte obbligatorio");
            return;
        }

        StringBuilder apiUrl = new StringBuilder(OPENF1_INTERVALS_URL)
                .append("?session_key=")
                .append(urlEncode(sessionKey))
                .append("&date%3E=")
                .append(urlEncode(dateGte));

        if (dateLte != null) {
            apiUrl.append("&date%3C=").append(urlEncode(dateLte));
        }

        proxyOpenF1Request(exchange, apiUrl.toString(), "Errore nel recupero intervalli da OpenF1");
    }

    private static void proxyOpenF1Request(HttpExchange exchange, String apiUrl, String errorMessage) throws IOException {
        try {
            System.out.println("Making request request: " + apiUrl);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .timeout(Duration.ofSeconds(15))
                    .GET()
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
            sendBytes(exchange, response.statusCode(), response.body().getBytes(StandardCharsets.UTF_8));
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            sendJsonError(exchange, 500, "Richiesta interrotta");
        } catch (Exception exception) {
            sendJsonError(exchange, 502, errorMessage);
        }
    }

    private static void handleStaticFile(HttpExchange exchange) throws IOException {
        String path = exchange.getRequestURI().getPath();
        if (path == null || "/".equals(path)) {
            path = "/index.html";
        }

        String resourcePath = "/static" + path;
        try (InputStream resource = OpenF1Application.class.getResourceAsStream(resourcePath)) {
            if (resource == null) {
                sendText(exchange, 404, "File non trovato");
                return;
            }

            byte[] body = resource.readAllBytes();
            exchange.getResponseHeaders().set("Content-Type", contentType(path));
            sendBytes(exchange, 200, body);
        }
    }

    private static Map<String, String> parseQuery(String rawQuery) {
        Map<String, String> values = new HashMap<>();
        if (rawQuery == null || rawQuery.isBlank()) {
            return values;
        }

        for (String pair : rawQuery.split("&")) {
            String[] parts = pair.split("=", 2);
            if (parts.length == 2) {
                values.put(urlDecode(parts[0]), urlDecode(parts[1]));
            }
        }
        return values;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String urlDecode(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    private static String contentType(String path) {
        if (path.endsWith(".css")) {
            return "text/css; charset=utf-8";
        }
        if (path.endsWith(".js") || path.endsWith(".jsx")) {
            return "text/javascript; charset=utf-8";
        }
        return "text/html; charset=utf-8";
    }

    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");
    }

    private static void sendJsonError(HttpExchange exchange, int statusCode, String message) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        String body = "{\"error\":\"" + message + "\"}";
        sendBytes(exchange, statusCode, body.getBytes(StandardCharsets.UTF_8));
    }

    private static void sendText(HttpExchange exchange, int statusCode, String message) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "text/plain; charset=utf-8");
        sendBytes(exchange, statusCode, message.getBytes(StandardCharsets.UTF_8));
    }

    private static void sendBytes(HttpExchange exchange, int statusCode, byte[] body) throws IOException {
        exchange.sendResponseHeaders(statusCode, body.length);
        try (OutputStream responseBody = exchange.getResponseBody()) {
            responseBody.write(body);
        }
    }
}
