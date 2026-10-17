/* Give an account access to the admin area (/admin).
   Usage (from the repo folder):  npm run make-admin -- you@example.com
   Remove access again with:      npm run make-admin -- you@example.com --remove */
import "../src/loadEnv.js";
import { PrismaClient } from "@prisma/client";

const args = process.argv.slice(2);
const email = args.find((a) => a.includes("@"))?.toLowerCase();
const remove = args.includes("--remove");
const prisma = new PrismaClient();

async function main() {
  if (!email) {
    console.error("Give the email of an existing Droba account, e.g.  npm run make-admin -- you@example.com");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account with the email ${email}. Sign up on the site first, then run this again.`);
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { role: remove ? "USER" : "ADMIN" } });
  console.log(remove ? `${email} is no longer an admin.` : `${email} is now an admin. Log out and back in, then open /admin.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
