import { useFetchClient } from "@strapi/helper-plugin"
import { useEffect, useState } from "react"

export function useCurrentUserIsSuperadmin() {
    const [isSuperAdmin, setIsSuperadmin] = useState(false)
    const { get } = useFetchClient()

    useEffect(() => {
        get('/admin/users/me')
            .then(({ data }) => {
                const me = data?.data
                const _isSuperAdmin = !!me?.roles?.find((role: { code: string }) => role.code === 'strapi-super-admin')
                setIsSuperadmin(_isSuperAdmin)
            })
    })

    return isSuperAdmin
}