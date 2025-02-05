import { Close, FingerIcon, FingerIcon2, FingerWIcon, GpsIcon } from '@/icons'
import L from 'leaflet'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { HiOutlineLocationMarker } from 'react-icons/hi'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import * as turf from '@turf/turf'
import { useAppDispatch, useAppSelector, useDisclosure } from '@/hooks'
import { setStateData } from '@/store'
import { useRouter } from 'next/router'
interface Props {
  selectedLocation: [number, number]
  handleLocationChange: (location: [number, number]) => void
  label: string
  setDrawnPoints: React.Dispatch<React.SetStateAction<any[]>>
  drawnPoints: any[]
}

interface LocationPickerProps {
  onLocationChange: (location: [number, number]) => void
}

const DrawingControl = ({
  isDrawing,
  drawnPoints,
  setDrawnPoints,
  polylineRef,
  housingData,
  onDrawingComplete,
  setItemFiles,
  mode,
  setMode,
}) => {
  const dispatch = useAppDispatch()
  const map = useMap()
  const overlayRef = useRef(null)
  const isDrawingRef = useRef(false)
  const drawingTimeoutRef = useRef(null)
  const lastPointRef = useRef(null)
  const minDistance = 5

  useEffect(() => {
    if (mode === 'dispose') {
      setItemFiles([])
      setDrawnPoints([])
      dispatch(setStateData([]))
      if (overlayRef.current) {
        overlayRef.current.remove()
        overlayRef.current = null
      }

      if (polylineRef.current) {
        polylineRef.current.remove()
      }

      if (drawingTimeoutRef.current) {
        cancelAnimationFrame(drawingTimeoutRef.current)
        drawingTimeoutRef.current = null
      }

      isDrawingRef.current = false
      lastPointRef.current = null
      setMode('none')
    }
  }, [mode])

  useEffect(() => {
    if (isDrawing) {
      setItemFiles([])

      if (overlayRef.current) {
        overlayRef.current.remove()
        overlayRef.current = null
      }

      if (drawingTimeoutRef.current) {
        cancelAnimationFrame(drawingTimeoutRef.current)
        drawingTimeoutRef.current = null
      }

      isDrawingRef.current = false
      lastPointRef.current = null
    }
  }, [isDrawing])
  useEffect(() => {
    if (map) {
      map.invalidateSize()
    }
  }, [])

  const countItemsInArea = useCallback(
    (points) => {
      if (points.length < 3) return

      const polygon = turf.polygon([points])
      const itemsInArea = housingData.filter((property) => {
        const point = turf.point([property.location.lat, property.location.lng])
        console.log('points:', points)

        return turf.booleanPointInPolygon(point, polygon)
      })
      setItemFiles(itemsInArea)
      dispatch(setStateData(itemsInArea))
      console.log('Items in area:', itemsInArea.length, itemsInArea)
    },
    [housingData]
  )

  const getPointDistance = useCallback(
    (point1, point2) => {
      if (!point1 || !point2) return Infinity
      const p1 = map.latLngToContainerPoint(point1)
      const p2 = map.latLngToContainerPoint(point2)
      return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    },
    [map]
  )

  const updateOverlay = useCallback(
    (points) => {
      if (!points.length) return

      if (overlayRef.current) {
        overlayRef.current.remove()
      }

      if (points.length < 3) return

      const bounds = map.getBounds()
      const outerCoords = [
        [bounds.getNorth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getEast()],
        [bounds.getSouth(), bounds.getEast()],
        [bounds.getSouth(), bounds.getWest()],
        [bounds.getNorth(), bounds.getWest()],
      ]

      const overlay = L.polygon([outerCoords, points], {
        color: 'none',
        fillColor: '#1A1E2566',
        fillOpacity: 0.45,
        interactive: false,
      }).addTo(map)

      overlayRef.current = overlay
    },
    [map]
  )

  const updatePolyline = useCallback(
    (points) => {
      if (polylineRef.current) {
        polylineRef.current.remove()
      }

      const polyline = L.polyline(points, {
        color: 'white',
        weight: 5,
        smoothFactor: 1,
        interactive: false,
      }).addTo(map)

      polylineRef.current = polyline
    },
    [map]
  )

  const throttledUpdate = useCallback(
    throttle((points) => {
      updatePolyline(points)
      updateOverlay(points)
    }, 16),
    [updatePolyline, updateOverlay]
  )

  const handleDrawingMove = useCallback(
    (latlng) => {
      if (!isDrawingRef.current) return

      const newPoint: any = [latlng.lat, latlng.lng]
      const lastPoint = lastPointRef.current

      // Check if the new point is far enough from the last point
      if (lastPoint && getPointDistance(L.latLng(lastPoint), L.latLng(newPoint)) < minDistance) {
        return
      }

      lastPointRef.current = newPoint

      setDrawnPoints((prev) => {
        const newPoints = [...prev, newPoint]

        if (drawingTimeoutRef.current) {
          cancelAnimationFrame(drawingTimeoutRef.current)
        }

        drawingTimeoutRef.current = requestAnimationFrame(() => {
          throttledUpdate(newPoints)
        })

        return newPoints
      })
    },
    [getPointDistance, throttledUpdate]
  )

  // Touch Events
  useEffect(() => {
    if (!map || !isDrawing) return

    const container = map.getContainer()

    const handleTouchStart = (e) => {
      e.preventDefault()
      if (!e.touches?.[0]) return // بررسی وجود touch
      const touch = e.touches[0]
      const rect = container.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const point = map.containerPointToLatLng([x, y])
      isDrawingRef.current = true
      setDrawnPoints([])
      handleDrawingMove(point)
    }

    const handleTouchMove = (e) => {
      e.preventDefault()
      if (!e.touches?.[0] || !isDrawingRef.current) return // بررسی وجود touch
      const touch = e.touches[0]
      const rect = container.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const point = map.containerPointToLatLng([x, y])
      handleDrawingMove(point)
    }

    const handleTouchEnd = (e) => {
      e.preventDefault()
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      lastPointRef.current = null

      setDrawnPoints((prev) => {
        if (prev.length > 2) {
          const closedPoints = [...prev, prev[0]]
          updateOverlay(closedPoints)
          countItemsInArea(closedPoints)
          onDrawingComplete() // فراخوانی تابع بعد از اتمام drawing
          return closedPoints
        }
        return prev
      })
    }

    // Mouse Events
    const handleMouseDown = (e) => {
      if (!e) return // بررسی وجود شیء رویداد
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const point = map.containerPointToLatLng([x, y])
      isDrawingRef.current = true
      setDrawnPoints([])
      handleDrawingMove(point)
    }

    const handleMouseMove = (e) => {
      if (!e || !isDrawingRef.current) return // افزودن بررسی وجود شیء رویداد
      const rect = container.getBoundingClientRect()

      // محاسبه مختصات نسبی با در نظر گرفتن موقعیت کانتینر
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      // تبدیل مختصات به موقعیت جغرافیایی
      const point = map.containerPointToLatLng([x, y])
      handleDrawingMove(point)
    }

    const handleMouseUp = () => {
      if (!isDrawingRef.current) return
      isDrawingRef.current = false
      lastPointRef.current = null

      setDrawnPoints((prev) => {
        if (prev.length > 2) {
          const closedPoints = [...prev, prev[0]]
          updateOverlay(closedPoints)
          countItemsInArea(closedPoints)
          onDrawingComplete() // فراخوانی تابع بعد از اتمام drawing
          return closedPoints
        }
        return prev
      })
    }

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })
    container.addEventListener('mousedown', handleMouseDown)
    container.addEventListener('mousemove', handleMouseMove)
    container.addEventListener('mouseup', handleMouseUp)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('mousedown', handleMouseDown)
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseup', handleMouseUp)
    }
  }, [map, isDrawing, handleDrawingMove, updateOverlay, countItemsInArea])

  // Cleanup
  useEffect(() => {
    return () => {
      if (overlayRef.current) overlayRef.current.remove()
      if (polylineRef.current) polylineRef.current.remove()
      if (drawingTimeoutRef.current) cancelAnimationFrame(drawingTimeoutRef.current)
    }
  }, [])

  // Toggle map interactions
  useEffect(() => {
    const controls = [
      map.dragging,
      map.touchZoom,
      map.doubleClickZoom,
      map.scrollWheelZoom,
      map.boxZoom,
      map.keyboard,
      map.tapHold,
    ].filter(Boolean)

    controls.forEach((control) => {
      isDrawing ? control.disable() : control.enable()
    })
  }, [isDrawing, map])

  return null
}

function throttle(func, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationChange }) => {
  const [position, setPosition] = useState<[number, number]>([35.6892, 51.389]) // مقدار پیش‌فرض تهران

  const customIcon = L.divIcon({
    html: renderToStaticMarkup(
      <div className="bg-red-500 rounded-full">
        <HiOutlineLocationMarker size={24} color="white" />
      </div>
    ),
    className: 'custo m-marker-icon',
    iconSize: [24, 24], // اندازه آیکون
    iconAnchor: [12, 24], // نقطه‌ای که روی موقعیت تنظیم می‌شود
  })

  useMapEvents({
    click(e) {
      const newPosition: [number, number] = [e.latlng.lat, e.latlng.lng]
      setPosition(newPosition)
      onLocationChange(newPosition)
    },
  })

  return <Marker icon={customIcon} position={position}></Marker>
}

const MapLocationPicker = (props: Props) => {
  const { selectedLocation, handleLocationChange, label,drawnPoints,setDrawnPoints } = props
  const { query, push } = useRouter()
  const { role, phoneNumber } = useAppSelector((state) => state.auth)
  const { housingMap } = useAppSelector((state) => state.statesData)
  const dispatch = useAppDispatch()
  // ? States
  const [isShow, modalHandlers] = useDisclosure()
  const [itemFiles, setItemFiles] = useState([])
  const [isSatelliteView, setIsSatelliteView] = useState(false)
  const [tileLayerUrl, setTileLayerUrl] = useState('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
  const [zoomLevel, setZoomLevel] = useState(12)
  const [isDrawing, setIsDrawing] = useState(false)
  const [selectedArea, setSelectedArea] = useState(null)
  const mapRef = useRef(null)
  const polylineRef = useRef(null)
  const [mode, setMode] = useState('none')
  const [viewedProperties, setViewedProperties] = useState<string[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const handleDrawingComplete = useCallback(() => {
    setIsDrawing(false)
    setMode('checking')
  }, [])
  const renderButtonContent = () => {
    switch (mode) {
      case 'drawing':
        return <FingerWIcon width="16px" height="16px" fill="#FDFDFD" />
      case 'checking':
        return <Close className="text-[20px] text-white" />
      default:
        return <FingerIcon width="19px" height="19px" />
    }
  }
  const handleDrawButtonClick = () => {
    if (mode === 'none') {
      setMode('drawing')
      setIsDrawing(true)
      setDrawnPoints([])
      setSelectedArea(null)
      if (polylineRef.current) {
        polylineRef.current.remove()
      }
    } else if (mode === 'checking') {
      setMode('dispose')
      setIsDrawing(false)
      setDrawnPoints([])
      setItemFiles([])
      if (polylineRef.current) {
        polylineRef.current.remove()
      }
    }
  }
  const userLocationIcon = L.divIcon({
    className: 'custom-user-location',
    html: `
      <div class="location-marker">
        <div class="location-marker__inner"></div>
      </div>
      <style>
        .location-marker {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.2);
          position: relative;
          animation: pulse 1.5s ease-in-out infinite;
        }
        
        .location-marker__inner {
          width: 12px;
          height: 12px;
          background: rgb(37, 99, 235);
          border: 2px solid white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 0 2px rgb(37, 99, 235);
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.5);
          }
          
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 15px rgba(37, 99, 235, 0);
          }
          
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(37, 99, 235, 0);
          }
        }
      </style>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
  const handleGPSClick = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation([latitude, longitude])

          // پن کردن نقشه به موقعیت کاربر
          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 15)
          }
        },
        (error) => {
          console.error('خطا در دریافت موقعیت:', error)
          alert('دسترسی به موقعیت مکانی امکان‌پذیر نیست')
        }
      )
    } else {
      alert('مرورگر شما از Geolocation پشتیبانی نمی‌کند')
    }
  }

  return (
    <div>
      <label className="block text-sm font-normal text-gray-700 mb-2">{label}</label>
      <div style={{ position: 'relative' }}>
        <div className="absolute flex flex-col gap-y-2.5 bottom-[9px] right-3 z-[999]">
          <div
            onClick={handleGPSClick}
            className="bg-white w-[32px] h-[32px] rounded-lg flex-center shadow-icon cursor-pointer"
          >
            <GpsIcon width="16px" height="16px" />
          </div>
          <button
            type="button"
            className={`${mode === 'drawing' ? 'bg-[#1A1E25]' : ''} ${mode === 'checking' ? 'bg-[#1A1E25]' : ''} ${
              mode !== 'drawing' && mode !== 'checking' && 'bg-white'
            }  w-[32px] h-[32px] rounded-lg flex-center shadow-icon`}
            onClick={handleDrawButtonClick}
            disabled={mode === 'drawing'}
          >
            {renderButtonContent()}
          </button>
        </div>
        <MapContainer
          center={[35.6892, 51.389]} // مقدار پیش‌فرض تهران
          zoom={12}
          style={{ height: '175px', width: '100%', borderRadius: '8px' }}
          ref={mapRef}
        >
          <DrawingControl
            isDrawing={isDrawing}
            drawnPoints={drawnPoints}
            setDrawnPoints={setDrawnPoints}
            polylineRef={polylineRef}
            housingData={[]}
            onDrawingComplete={handleDrawingComplete}
            setItemFiles={setItemFiles}
            mode={mode}
            setMode={setMode}
          />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="hhttps://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          {userLocation && <Marker position={userLocation} icon={userLocationIcon} />}
          <LocationPicker onLocationChange={handleLocationChange} />
        </MapContainer>
      </div>
    </div>
  )
}

export default MapLocationPicker
