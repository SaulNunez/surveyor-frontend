export interface ClientInputDao {
    clientName: string,
    clientDescription: string,
    redirectUris: string[]
}

export interface ClientOutputDao {
    clientName: string,
    clientDescription: string,
    redirectUris: string[],
    clientId: string,
    clientSecret: string
}