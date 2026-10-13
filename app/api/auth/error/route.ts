import { redirect } from "next/navigation"

export async function GET() {
  redirect("/login")
}

export async function POST() {
  redirect("/login")
}
