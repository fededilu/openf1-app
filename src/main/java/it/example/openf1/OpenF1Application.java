package it.example.openf1;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
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
    private static final String OPENF1_SESSIONS_URL = "https://api.openf1.org/v1/sessions";
    private static final String OPENF1_DRIVERS_STANDING = "https://api.openf1.org/v1/championship_drivers";
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static void main(String[] args) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
        server.createContext("/api/drivers", OpenF1Application::handleDrivers);
        server.createContext("/api/sessions", OpenF1Application::handleSessions);
        server.createContext("/api/championship_drivers", OpenF1Application::handleChampionship);
        server.createContext("/", OpenF1Application::handleStaticFile);
        server.start();

        System.out.println("Server avviato: http://localhost:" + PORT);
        System.out.println("API locale: http://localhost:" + PORT + "/api/drivers?session_key=9158");
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
        String apiUrl = OPENF1_SESSIONS_URL
                + "?session_key=" + urlEncode(sessionKey);
        System.out.println("Making champion ship request");
        proxyOpenF1Request(exchange, apiUrl, "Errore nel recupero sessioni da OpenF1");
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
        String year = query.getOrDefault("year", "2026");
        String sessionName = query.getOrDefault("session_name", "Race");
        String apiUrl = OPENF1_SESSIONS_URL
                + "?year=" + urlEncode(year)
                + "&session_name=" + urlEncode(sessionName);
        System.out.println("Making session request");

        proxyOpenF1Request(exchange, apiUrl, "Errore nel recupero championship da OpenF1");
    }

    private static void proxyOpenF1Request(HttpExchange exchange, String apiUrl, String errorMessage) throws IOException {
        try {
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
                values.put(parts[0], parts[1]);
            }
        }
        return values;
    }

    private static String urlEncode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
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
