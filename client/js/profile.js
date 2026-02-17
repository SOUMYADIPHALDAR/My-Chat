const Base_URL = "http://localhost:5000";

async function getMyProfile(){
    const response = await fetch(`${Base_URL}/user/profile`, {
        method: "GET",
        credentials: "include"
    })
}