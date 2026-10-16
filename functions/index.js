const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();
const db = getFirestore();

async function createNotificationAndPush({ title, message, type, authorId }) {
  await db.collection("notifications").add({
    title, message, type, authorId: authorId || null,
    createdAt: FieldValue.serverTimestamp()
  });

  // Send to registered devices; avoid notifying the person who caused the event.
  const usersSnap = await db.collection("users").get();
  const tokens = [];
  for (const userDoc of usersSnap.docs) {
    if (authorId && userDoc.id === authorId) continue;
    const token = userDoc.get("fcmToken");
    if (typeof token === "string" && token.length > 20) tokens.push(token);
  }

  // FCM multicast supports up to 500 registration tokens per request.
  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    if (!batch.length) continue;
    try {
      await getMessaging().sendEachForMulticast({
        tokens: batch,
        notification: { title, body: message },
        webpush: {
          notification: { title, body: message, icon: "/favicon.png" },
          fcmOptions: { link: "/#community" }
        }
      });
    } catch (error) {
      console.error("FCM send failed:", error);
    }
  }
}

exports.onNewPost = onDocumentCreated("posts/{postId}", async event => {
  const p = event.data?.data();
  if (!p) return;
  await createNotificationAndPush({
    title: "New community post",
    message: `${p.authorName || "A member"} shared: ${(p.message || "").slice(0, 100)}`,
    type: "post",
    authorId: p.authorId
  });
});

exports.onNewComment = onDocumentCreated("posts/{postId}/comments/{commentId}", async event => {
  const c = event.data?.data();
  if (!c) return;
  await createNotificationAndPush({
    title: "New comment",
    message: `${c.authorName || "A member"} commented on a community post.`,
    type: "comment",
    authorId: c.authorId
  });
});

exports.onNewRecipe = onDocumentCreated("recipes/{recipeId}", async event => {
  const r = event.data?.data();
  if (!r) return;
  await createNotificationAndPush({
    title: "New recipe published",
    message: `${r.name || "A new recipe"} is now available on MawyaMade.`,
    type: "recipe",
    authorId: r.authorId
  });
});
