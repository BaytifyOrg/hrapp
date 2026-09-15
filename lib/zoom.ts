async function getZoomAccessToken(): Promise<string> {
  const basic = Buffer.from(`${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`).toString("base64");

  const res = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: { Authorization: `Basic ${basic}` },
    }
  );

  if (!res.ok) throw new Error(`Zoom auth failed: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

export async function createZoomMeeting({
  topic,
  startTime,
  durationMinutes,
}: {
  topic: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
}): Promise<{ joinUrl: string; meetingId: number }> {
  const token = await getZoomAccessToken();
  const host = process.env.ZOOM_HOST_EMAIL;

  const res = await fetch(`https://api.zoom.us/v2/users/${host}/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic,
      type: 2,
      start_time: startTime,
      duration: durationMinutes,
      timezone: "Asia/Dubai",
      settings: {
        join_before_host: true,
        waiting_room: false,
        approval_type: 2,
      },
    }),
  });

  if (!res.ok) throw new Error(`Zoom meeting creation failed: ${await res.text()}`);
  const data = await res.json();
  return { joinUrl: data.join_url, meetingId: data.id };
}
