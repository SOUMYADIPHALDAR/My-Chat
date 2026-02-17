const Base_URL = "http://localhost:5000";

async function fetchWithAuth(url, options = {}){
    try {
        const config = {
            credentials: "include",
            ...options
        }

        let response = await fetch(url, config);

        if(response.status === 401){
            console.log("Token expired. Try to refresh tokens...");

            const refreshResponse = await fetch(`${Base_URL}/user/refreshAccessToken`, {
                method: "POST",
                credentials: "include"
            });

            if(!refreshResponse.ok){
                console.log("Refresh failed. Redirecting to the login page...");
                window.location.href = "/login.html";
                return;
            }

        }

        response = await fetch(url, config);

        return response;
    } catch (error) {
        console.log("Fetch error: ", error.message);
        throw error;
    }
}