const express = require("express");
const axios = require("axios");
const { JSDOM } = require("jsdom");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Endpoint para el scraping
app.get("/api/scrape", async (req, res) => {
  const keyword = req.query.keyword;

  if (!keyword) {
    return res.status(400).json({ error: "Falta keyword" });
  }

  const amazonUrl = `https://www.amazon.com/s?k=${encodeURIComponent(keyword)}`;

  try {
    // Obtener HTML
    const response = await axios.get(amazonUrl, {
      validateStatus: (status) => {
        return status >= 200 && status < 500;
      },
    });

    // Si Amazon respondió con un error de cliente o servidor
    if (response.status !== 200) {
      console.warn(
        `Amazon respondió con estado ${response.status} para la URL: ${amazonUrl}`
      );
      if (response.status >= 400) {
        return res.status(502).json({
          error: `Amazon devolvió un error ${response.status}. Puede ser un bloqueo temporal o CAPTCHA.`,
          amazon_status: response.status,
        });
      }
    }

    const html = response.data;

    // Analizar el HTML con JSDOM
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extraer los datos del producto
    const products = [];
    const items = document.querySelectorAll(
      'div[data-component-type="s-search-result"]'
    );

    items.forEach((item) => {
      let title = null,
        rating = null,
        reviews = null,
        imageUrl = null;

      try {
        // Busca titulo
        const titleElement = item.querySelector("h2 a span");
        title = titleElement?.textContent?.trim();

        // Busca icono de estrella
        const ratingElement = item.querySelector("i.a-icon-star-small");
        if (ratingElement) {
          const ratingText = ratingElement.textContent?.trim().split(" ")[0];
          if (ratingText) {
            rating = parseFloat(ratingText);
          }
        }

        // Busca numero de reviews
        const reviewsElement = item.querySelector(
          "span.a-size-base.s-underline-text"
        );
        if (reviewsElement) {
          const reviewsText = reviewsElement.textContent
            ?.trim()
            .replace(/[,.]/g, "");
          if (reviewsText && /^\d+$/.test(reviewsText)) {
            reviews = parseInt(reviewsText, 10);
          }
        }

        // Busca URL de la imagen
        const imageElement = item.querySelector("img.s-image");
        imageUrl = imageElement?.getAttribute("src");

        // Solo añade el producto si tiene todos los valores
        if (title && rating && reviews && imageUrl) {
          products.push({
            title,
            rating,
            reviews,
            imageUrl,
          });
        }
      } catch (e) {
        // Si algo falla extrayendo datos de un item específico, lo ignoramos y continuamos con el siguiente
        console.warn("Error procesando un item:", e.message);
      }
    });

    if (products.length === 0) {
      console.warn(
        `No se extrajeron productos o los selectores fallaron para keyword "${keyword}"`
      );
    }

    res.json(products);
  } catch (error) {
    console.error("Error general durante el scraping:", error.message);

    if (error.response) {
      console.error("Status code de Amazon (en catch):", error.response.status);
      console.error("Data de Amazon (en catch):", error.response.data); // Puede contener HTML de error o CAPTCHA
    } else if (error.request) {
      // La petición se hizo pero no se recibió respuesta
      console.error("No se recibió respuesta de Amazon.");
      res
        .status(504)
        .json({
          error: "No se recibió respuesta de Amazon.",
          details: error.message,
        });
    } else {
      // Error al configurar la petición
      console.error("Error configurando la petición a Amazon:", error.message);
      res
        .status(500)
        .json({
          error: "Error interno del servidor al intentar hacer scraping.",
          details: error.message,
        });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
