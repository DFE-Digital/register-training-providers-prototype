module.exports = {
  provider: [
    'operatingName',
    'legalName',
    'type',
    'ukprn',
    'urn',
    'code',
    'website',
    'archivedAt',
    'archivedById',
    'deletedAt',
    'deletedById'
  ],
  providerAccreditation: [
    'number',
    'startsOn',
    'endsOn',
    'deletedAt',
    'deletedById'
  ],
  providerAddress: [
    'line1',
    'line2',
    'line3',
    'town',
    'county',
    'postcode',
    'latitude',
    'longitude',
    'deletedAt',
    'deletedById'
  ],
  providerContact: [
    'firstName',
    'lastName',
    'email',
    'telephone',
    'deletedAt',
    'deletedById'
  ],
  providerPartnership: [
    'accreditedProviderId',
    'trainingPartnerId',
    'startsOn',
    'endsOn',
    'deletedAt',
    'deletedById'
  ],
  user: [
    'firstName',
    'lastName',
    'email',
    'isApiUser',
    'isActive',
    'deletedAt',
    'deletedById'
  ],
  academicYear: [
    'code',
    'name',
    'startsOn',
    'endsOn',
    'deletedAt',
    'deletedById'
  ],
  apiClientToken: [
    'clientName',
    'expiresAt',
    'revokedAt',
    'revokedById',
    'deletedAt',
    'deletedById'
  ]
}
