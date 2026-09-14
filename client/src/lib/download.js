// Download a binary (PDF) from the API and trigger a browser save.
// Uses axios with responseType blob so cookies still travel with withCredentials.
import api from "../api/axios.js";

export async function downloadReport(url, filename) {
  const res = await api.get(url, { responseType: "blob" });
  const blobUrl = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}