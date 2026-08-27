const BACKEND = "https://christnow-backend-777aa5f9a483.herokuapp.com";

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);

  const pathParts = params.path;
  const subPath = Array.isArray(pathParts)
    ? pathParts.join("/")
    : pathParts || "";
  const backendPath = subPath ? `/${subPath}` : "";
  const targetUrl = `${BACKEND}${backendPath}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  return fetch(targetUrl, init);
}
