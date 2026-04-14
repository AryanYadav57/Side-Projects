const API_KEY = process.env.NVIDIA_API_KEY;
async function test() {
  const models = [
    'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux-2-klein-4b',
    'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux_2-klein-4b',
    'https://integrate.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b',
    'https://integrate.api.nvidia.com/v1/images/generations',
  ];
  
  for (const url of models) {
    try {
      console.log(`Testing ${url}`);
      const body = url.includes('images/generations') 
        ? JSON.stringify({
            model: "black-forest-labs/flux.2-klein-4b",
            prompt: "A futuristic city",
            size: "1024x1024",
            n: 1
          })
        : JSON.stringify({
            prompt: 'A futuristic city',
            height: 1024,
            width: 1024,
            steps: 4,
            seed: 0,
            samples: 1
          });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json'
        },
        body
      });
      console.log(response.status);
      const text = await response.text();
      console.log(text.substring(0, 100)); // only log first 100 chars
      if (response.ok) {
        console.log(`✅ Success with URL: ${url}`);
        break;
      }
    } catch (e) {
      console.log(e.message);
    }
  }
}
test();
