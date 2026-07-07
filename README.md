# OpenF1 Java React App

Piccola applicazione con backend Java e frontend React che mostra i dati della API OpenF1:

```text
https://api.openf1.org/v1/drivers?driver_number=1&session_key=9158
```

## Requisiti

- Java 17
- Maven 3

## Avvio

```bash
mvn compile exec:java
```

Poi apri:

```text
http://localhost:8080
```

Endpoint backend locale:

```text
http://localhost:8080/api/drivers?driver_number=1&session_key=9158
```

## Struttura

- `src/main/java/it/example/openf1/OpenF1Application.java`: server Java, endpoint REST e file statici.
- `src/main/resources/static/index.html`: pagina principale.
- `src/main/resources/static/app.jsx`: componente React.
- `src/main/resources/static/styles.css`: stile della lista.
