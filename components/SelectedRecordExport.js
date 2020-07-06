import React from 'react'
import {
  useRecordById,
  Button, Tooltip, Text, RecordCard, Link, Box
} from '@airtable/blocks/ui'
import download from 'downloadjs'
import tokml from '@maphubs/tokml'
import { QRCode } from 'react-qr-svg'

function onDownloadKML (features, name) {
  const geoJSON = {
    type: 'FeatureCollection',
    features
  }
  const kml = tokml(geoJSON)
  download(`data:text/xml;charset=utf-8,${kml}`, `${name}.kml`, 'text/xml')
}

function onDownloadGeoJSON (features, name) {
  const geoJSON = {
    type: 'FeatureCollection',
    features
  }
  download(`data:application/json;charset=utf-8,${JSON.stringify(geoJSON)}`, `${name}.geojson`, 'application/json')
}

export default function SelectedRecordExport ({table, recordId}) {
  const record = useRecordById(table, recordId)
  let location
  try {
    location = record.getCellValue('Location')
  } catch (err) {
    console.log(err.message)
  }
  if (!location) {
    return (
      <Text style={{color: 'red'}}>Error: Must countain a field named Location, with latitude,longitude</Text>
    )
  }
  if (typeof location !== 'string' && Array.isArray(location) && location.length > 0) {
    // handle special case where the Location field is a lookup
    location = location[0]
  }
  const locationParts = location.split(',')
  let feature
  let lat
  let lon
  if (locationParts.length === 2) {
    lat = parseFloat(locationParts[0])
    lon = parseFloat(locationParts[1])
    feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Point',
        coordinates: [lon, lat]
      }
    }
  }

  return (
    <>
      <div style={{width: '100%', overflowX: 'auto'}}>
        <RecordCard record={record} />
      </div>
      {!feature &&
        <Text>Error: Record must have a Location field.</Text>}
      {feature &&
        <div style={{position: 'relative', padding: '10px 5px'}}>
          <div style={{width: '100%'}}>
            <div style={{padding: '10px'}}>
              <div style={{marginBottom: '5px'}}>
                <Link
                  href={`https://www.openstreetmap.org/#map=12/${lat}/${lon}`}
                  target='_blank'
                  icon='mapPin'
                  size='xlarge'
                >
                  Open in OpenStreetMap
                </Link>
              </div>
              <div>
                <Link
                  href={`https://www.google.com/maps/@${lat},${lon},12z`}
                  target='_blank'
                  icon='mapPin'
                  size='xlarge'
                >
                  Open in Google Maps
                </Link>
              </div>
            </div>
            <div style={{padding: '10px'}}>
              <div style={{marginBottom: '5px'}}>
                <Button onClick={() => onDownloadKML([feature], record.name)} icon='download'>
                  Download KML (Google Earth)
                </Button>
              </div>
              <div style={{marginBottom: '5px'}}>
                <Button onClick={() => onDownloadGeoJSON([feature], record.name)} icon='download'>
                  Download GeoJSON
                </Button>
              </div>
            </div>
          </div>
          <div style={{width: '64px'}}>
            <Tooltip
              content='Scan with your phone to open in Apple Maps or Google Maps'
              placementX={Tooltip.placements.CENTER}
              placementY={Tooltip.placements.BOTTOM}
              shouldHideTooltipOnClick
            >
              <QRCode
                bgColor='#FFFFFF'
                fgColor='#000000'
                level='L'
                style={{ width: 64 }}
                value={`geo:${lat},${lon}`}
              />
            </Tooltip>

          </div>
          <Text>scan with your phone</Text>
        </div>}
    </>
  )
}
