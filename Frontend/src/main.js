const keywordInput = document.getElementById("keywordInput");
const searchButton = document.getElementById("searchButton");
const resultsContainer = document.getElementById("resultsContainer");
const loadingIndicator = document.getElementById("loadingIndicator");
const errorMessages = document.getElementById("errorMessages");

searchButton.addEventListener("click", async () => {
  const keyword = keywordInput.value.trim();
  if (!keyword) {
    return (errorMessages.textContent =
      "Por favor, introduce una palabra clave");
  }

  // Limpiar resultados y errores anteriores, mostrar carga
  resultsContainer.innerHTML = "";
  errorMessages.textContent = "";
  loadingIndicator.style.display = "block";

  try {
    const response = await fetch(
      `http://localhost:3000/api/scrape?keyword=${encodeURIComponent(keyword)}`
    );

    const products = await response.json();

    if (products.length === 0) {
      errorMessages.textContent =
        "No se encontraron productos para esta búsqueda o hubo un problema al obtenerlos";
    } else {
      displayResults(products);
    }
  } catch (error) {
    console.error("Error al realizar peticion al servidor:", error);
    errorMessages.textContent = `Error: ${error.message}`;
  } finally {
    // Ocultar indicador de carga
    loadingIndicator.style.display = "none";
  }
});

const displayResults = (products) => {
  products.forEach((product) => {
    const productDiv = document.createElement("div");
    productDiv.classList.add("product-item");

    const img = document.createElement("img");
    img.src = product.imageUrl;
    img.alt = product.title;

    const title = document.createElement("h3");
    title.textContent = product.title;

    const rating = document.createElement("p");
    rating.textContent = product.rating
      ? `Calificación: ${product.rating} / 5`
      : "Sin calificación";

    const reviews = document.createElement("p");
    reviews.textContent = product.reviews
      ? `Reseñas: ${product.reviews}`
      : "Sin reseñas";

    productDiv.appendChild(img);
    productDiv.appendChild(title);
    productDiv.appendChild(rating);
    productDiv.appendChild(reviews);

    resultsContainer.appendChild(productDiv);
  });
};
