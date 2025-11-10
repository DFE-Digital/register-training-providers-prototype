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
    // 'uprn',
    'line1',
    'line2',
    'line3',
    'town',
    'county',
    'postcode',
    'latitude',
    'longitude',
    // 'googlePlaceId',
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
  providerAccreditationPartnership: [
    'providerAccreditationId',
    'partnerId',
    'deletedAt',
    'deletedById'
  ],
  providerPartnership: [
    'accreditedProviderId',
    'trainingProviderId',
    'deletedAt',
    'deletedById'
  ],
  user: [
    'firstName',
    'lastName',
    'email',
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
  ]
}
