import {NextResponse} from "next/server";

import {rotateUserGatewayApiKey} from "@/lib/database/gateway-api-keys";
import {resetGatewayApiKeyAuthCache} from "@/lib/gateway/request-auth";
import {getAuthenticatedUser} from "@/lib/user/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({message: "未登录用户中心"}, {status: 401});
  }

  try {
    const key = await rotateUserGatewayApiKey({
      userId: user.id,
      username: user.username,
      displayName: user.display_name,
    });
    resetGatewayApiKeyAuthCache();

    return NextResponse.json({
      key: {
        id: key.id,
        key_name: key.key_name,
        raw_key: key.raw_key,
        key_prefix: key.key_prefix,
      },
      message: "访问 key 已重置",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "重置访问 key 失败";
    return NextResponse.json({message}, {status: 500});
  }
}
