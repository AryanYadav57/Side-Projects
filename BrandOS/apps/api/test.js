 

async function main() {
  const apiKey = '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';
  const urls = [
    'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b',
    'https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux_2-klein-4b',
    'https://ai.api.nvidia.com/v1/images/generations'
  ];

  for (const url of urls) {
    console.log("Testing", url);
    const body = url.includes('images/generations') ? {
        prompt: "A cute dog",
        model: "black-forest-labs/flux.2-klein-4b"
    } : {
        prompt: "A cute dog",
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    console.log(res.status, await res.text().catch(() => ''));
  }
}
main();
