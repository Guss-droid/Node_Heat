import axios from "axios" 
import { sign } from "jsonwebtoken"
import { prismaClient } from "../prisma"

type IAcccesTokenProps = {
  access_token: string;
}

type IUserProps = {
  avatar_url: string;
  login: string;
  id: number;
  name: string
}

export class AuthenticateUserService {

  async execute(code: string) {
    const url = "https://github.com/login/oauth/access_token"

    const {data : accessTokenResponse} = await axios.post<IAcccesTokenProps>(url, null, {
      params: {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      headers: {
        "Accept": "application/json"
      }
    })

    const res = await axios.get<IUserProps>("https://api.github.com/user", {
      headers: {
        authorization: `Bearer ${accessTokenResponse.access_token}`
      }
    })

    const {avatar_url, id, login, name} = res.data

    let user = await prismaClient.user.findFirst({
      where: {
        github_id: id
      }
    })

    if(!user){
     user = await prismaClient.user.create({
        data:{
          github_id: id,
          name,
          avatar_url, 
          login
        }
      })
    }

    const token = sign({
      user: {
        name: user.name,
        avatar_url: user.avatar_url,
        id: user.id
      }
    },process.env.TOKEN_SECRET, {
      subject: user.id,
      expiresIn: "1d"
    })

    return {token, user}
  }

}