export async function getHomeData() {

  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("User is not logged in");
  }

  const response = await fetch(
    "http://127.0.0.1:5000/home",
    {
      method: "GET",

      headers: {
        "Authorization": `Bearer ${token}`
      }
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || "Failed to load home data"
    );
  }

  return data;
}