import { NextRequest } from 'next/server'
import { ActionGetResponse, ActionPostRequest, ActionPostResponse, ActionError, ACTIONS_CORS_HEADERS, createPostResponse, MEMO_PROGRAM_ID } from "@solana/actions"
import { Transaction, TransactionInstruction, PublicKey, ComputeBudgetProgram, Connection, clusterApiUrl, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js"
import { connectToDB } from '@/utils/database'
import Player from '@/models/player'
import axios from 'axios'

const ACTION_URL = "https://52bd-122-172-83-213.ngrok-free.app/api/actions/form"

export const GET = async (req: Request) => {

  const payload: ActionGetResponse = {
    icon: `https://blue-magnetic-wallaby-228.mypinata.cloud/ipfs/QmWqVwNn2REZ5rUV848LtcNiSFsLZq17fvbn7C9wd6hFga`,
    label: "submit",
    title: "Wanna play 1v1 chess on blinks using reclaim protocol?",
    description: "\nenter your chess.com and x username and you will receive a game blink on your dm",
    disabled: false,
    links: {
      actions: [
        {
          href: `${ACTION_URL}?x={x}&chess={chess}`,
          label: "submit",
          parameters: [
            {
              name: "chess",
              label: "your chess.com username",
              required: true
            },
            {
              name: "x",
              label: "your x username",
              required: true
            }
          ]
        }
      ]
    }
  }

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS
  })
}

export const OPTIONS = GET

async function fetchChessRating(username: string) {
  const chessApiUrl = `https://api.chess.com/pub/player/${username}/stats`

  try {
    const response = await axios.get(chessApiUrl)
    const data = response.data
    console.log(data)

    if (data && data.chess_rapid && data.chess_rapid.last) {
      return data.chess_rapid.last.rating
    } else {
      throw new Error('Invalid response from Chess.com')
    }
  } catch (error) {
    console.error('Error fetching Chess.com stats:', error)
    return 0
  }
}

export const POST = async (req: NextRequest) => {
  await connectToDB()

  try {
    const body: ActionPostRequest = await req.json()

    let account: PublicKey

    try { 
      account = new PublicKey(body.account)
    } catch (err) {
      return new Response('Invalid account provided', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS
      })
    }

    console.log("Address:", account.toBase58())

    const x_username = req.nextUrl.searchParams.get('x')
    console.log("X Username:", x_username)
    const chess_username = req.nextUrl.searchParams.get('chess')
    console.log("Chess Username:", chess_username)

    if (!x_username || !chess_username) {
      return new Response('Missing required parameters', {
        status: 400,
        headers: ACTIONS_CORS_HEADERS
      })
    }

    if (x_username !== "{x}" && chess_username !== "{chess}") {
      const chess_rating = await fetchChessRating(chess_username)

      const player = new Player({
        address: account.toBase58(),
        x_username,
        chess_username,
        chess_rating
      })
  
      await player.save()
    }

    const connection = new Connection(clusterApiUrl("mainnet-beta"))
    // const connection = new Connection(`https://solana-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
    const transaction = new Transaction()

    transaction.add(
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: 1000
      }),
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        data: Buffer.from("reclaim on blinks", "utf-8"),
        keys: []
      })
    )

    transaction.feePayer = account
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash

    const payload: ActionPostResponse = await createPostResponse({
      fields: {
        transaction,
        message: `keep your dm's open, you'll receive a game blink soon`
      },
    })

    return Response.json(payload, { headers: ACTIONS_CORS_HEADERS })
  } catch (err) {
    console.error(err)
    return Response.json("An unknown error occured", { status: 500 })
  }
}
